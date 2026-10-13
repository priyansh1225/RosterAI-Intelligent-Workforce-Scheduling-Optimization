from datetime import datetime, time, timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from employees.models import Employee, EmployeeAvailability, LeaveRequest
from forecasting.services import estimate_department_staffing
from occupancy.models import OccupancyRecord
from .models import Roster, Shift
from .services import create_shift, validate_shift


def _shift_datetimes(day, rule):
    start_at = timezone.make_aware(
        datetime.combine(day, rule.shift_start_time), timezone.get_current_timezone()
    )
    end_day = day + timedelta(days=1) if rule.shift_end_time < rule.shift_start_time else day
    end_at = timezone.make_aware(
        datetime.combine(end_day, rule.shift_end_time), timezone.get_current_timezone()
    )
    return start_at, end_at


def _weekly_workload(employee, start_at):
    week_start_day = start_at.date() - timedelta(days=start_at.weekday())
    week_start = timezone.make_aware(
        datetime.combine(week_start_day, time.min), timezone.get_current_timezone()
    )
    week_end = week_start + timedelta(days=7)
    return sum(
        (shift.end_at - shift.start_at).total_seconds()
        for shift in Shift.objects.filter(
            employee=employee, start_at__lt=week_end, end_at__gt=week_start
        ).exclude(status=Shift.Status.CANCELLED)
    )


def _eligible_candidates(rule, day):
    return Employee.objects.select_related("department").filter(
        department=rule.department,
        department__is_active=True,
        employment_status=Employee.EmploymentStatus.ACTIVE,
        is_available=True,
        availability_records__date=day,
        availability_records__status=EmployeeAvailability.Status.AVAILABLE,
    ).exclude(
        leave_requests__status=LeaveRequest.Status.APPROVED,
        leave_requests__start_date__lte=day,
        leave_requests__end_date__gte=day,
    ).distinct()


@transaction.atomic
def generate_draft_roster(*, day, created_by, department_id=None):
    try:
        occupancy = OccupancyRecord.objects.get(date=day)
    except OccupancyRecord.DoesNotExist as exc:
        raise ValidationError({"date": "An occupancy record is required before generating demand-based rosters."}) from exc

    roster = Roster.objects.create(date=day, created_by=created_by)
    shortages = []
    requirements = estimate_department_staffing(occupancy)
    if department_id:
        requirements = [item for item in requirements if item["rule"].department_id == int(department_id)]

    for requirement in requirements:
        rule = requirement["rule"]
        start_at, end_at = _shift_datetimes(day, rule)
        scheduled_employees = set(Shift.objects.filter(
            department=rule.department,
            status__in=[Shift.Status.DRAFT, Shift.Status.PUBLISHED],
            start_at__lt=end_at,
            end_at__gt=start_at,
        ).values_list("employee_id", flat=True))
        missing = max(requirement["required_staff"] - len(scheduled_employees), 0)
        candidates = list(_eligible_candidates(rule, day).exclude(pk__in=scheduled_employees))
        candidates.sort(key=lambda employee: (_weekly_workload(employee, start_at), employee.pk))
        assigned = 0
        reasons = []
        for employee in candidates:
            if assigned >= missing:
                break
            try:
                create_shift(
                    employee_id=employee.pk,
                    department_id=rule.department_id,
                    start_at=start_at,
                    end_at=end_at,
                    status=Shift.Status.DRAFT,
                    assignment_source=Shift.AssignmentSource.RULES,
                    required_skills=rule.required_skills,
                    roster_id=roster.pk,
                )
            except ValidationError as exc:
                reasons.extend(exc.messages)
                continue
            assigned += 1
        shortage = missing - assigned
        if shortage:
            shortages.append({
                "department_id": rule.department_id,
                "department": rule.department.name,
                "required_staff": requirement["required_staff"],
                "already_scheduled": len(scheduled_employees),
                "assigned_in_draft": assigned,
                "unfilled": shortage,
                "required_skills": rule.required_skills,
                "reasons": list(dict.fromkeys(reasons)) or ["No eligible, available employees were found."],
            })
    roster.shortage_summary = shortages
    roster.save(update_fields=["shortage_summary"])
    return roster


@transaction.atomic
def approve_roster(*, roster_id, reviewer, note=""):
    roster = Roster.objects.select_for_update().get(pk=roster_id)
    if roster.status != Roster.Status.DRAFT:
        raise ValidationError({"status": "Only draft rosters can be approved."})
    if roster.shortage_summary and not note.strip():
        raise ValidationError({"approval_note": "Provide a justification to approve a roster with staffing shortages."})
    for shift in roster.shifts.select_related("employee", "department"):
        validate_shift(
            employee=shift.employee,
            department=shift.department,
            start_at=shift.start_at,
            end_at=shift.end_at,
            required_skills=shift.required_skills,
            exclude_pk=shift.pk,
        )
    roster.status = Roster.Status.APPROVED
    roster.approval_note = note.strip()
    roster.reviewed_by = reviewer
    roster.reviewed_at = timezone.now()
    roster.save(update_fields=["status", "approval_note", "reviewed_by", "reviewed_at"])
    return roster


@transaction.atomic
def publish_roster(*, roster_id):
    roster = Roster.objects.select_for_update().get(pk=roster_id)
    if roster.status != Roster.Status.APPROVED:
        raise ValidationError({"status": "A roster must be approved before publication."})
    for shift in roster.shifts.select_for_update():
        shift.status = Shift.Status.PUBLISHED
        shift.save(update_fields=["status", "updated_at"])
    roster.status = Roster.Status.PUBLISHED
    roster.published_at = timezone.now()
    roster.save(update_fields=["status", "published_at"])
    return roster
