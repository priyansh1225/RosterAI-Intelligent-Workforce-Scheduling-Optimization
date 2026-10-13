from datetime import datetime, time, timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from employees.models import Employee, EmployeeAvailability, LeaveRequest
from .models import Shift


MIN_REST = timedelta(hours=10)
MAX_SHIFT_LENGTH = timedelta(hours=16)


def _availability_covers(employee, start_at, end_at):
    records = EmployeeAvailability.objects.filter(
        employee=employee,
        date=start_at.date(),
        status=EmployeeAvailability.Status.AVAILABLE,
    )
    for record in records:
        if record.start_time is None:
            return True
        available_start = timezone.make_aware(
            datetime.combine(record.date, record.start_time), timezone.get_current_timezone()
        )
        end_date = record.date + timedelta(days=1) if record.end_time < record.start_time else record.date
        available_end = timezone.make_aware(
            datetime.combine(end_date, record.end_time), timezone.get_current_timezone()
        )
        if available_start <= start_at and end_at <= available_end:
            return True
    return False


def _overlap_hours(start, end, period_start, period_end):
    overlap_start = max(start, period_start)
    overlap_end = min(end, period_end)
    return max((overlap_end - overlap_start).total_seconds(), 0) / 3600


def validate_shift(*, employee, department, start_at, end_at, required_skills=None, exclude_pk=None):
    required_skills = required_skills or []
    if end_at <= start_at:
        raise ValidationError({"end_at": "Shift end must be after shift start."})
    if end_at - start_at > MAX_SHIFT_LENGTH:
        raise ValidationError({"end_at": "A shift cannot exceed 16 hours."})
    if employee.employment_status != Employee.EmploymentStatus.ACTIVE:
        raise ValidationError({"employee": "Inactive employees cannot be assigned shifts."})
    if not employee.is_available:
        raise ValidationError({"employee": "Employee is marked unavailable."})
    if not department.is_active:
        raise ValidationError({"department": "Inactive departments cannot receive shifts."})
    if employee.department_id != department.pk:
        raise ValidationError({"department": "Shift department must match the employee's department."})
    if not isinstance(required_skills, list) or any(
        not isinstance(skill, str) or not skill.strip() for skill in required_skills
    ):
        raise ValidationError({"required_skills": "Required skills must be a list of non-empty strings."})
    employee_skills = {skill.casefold() for skill in employee.skills if isinstance(skill, str)}
    missing = [skill for skill in required_skills if skill.casefold() not in employee_skills]
    if missing:
        raise ValidationError({"required_skills": f"Employee lacks required skills: {', '.join(missing)}."})
    if LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequest.Status.APPROVED,
        start_date__lte=end_at.date(),
        end_date__gte=start_at.date(),
    ).exists():
        raise ValidationError({"employee": "Employee has approved leave overlapping this shift."})
    if not _availability_covers(employee, start_at, end_at):
        raise ValidationError({"employee": "No available time record covers the complete shift."})

    conflicts = Shift.objects.filter(employee=employee).exclude(status=Shift.Status.CANCELLED)
    if exclude_pk:
        conflicts = conflicts.exclude(pk=exclude_pk)
    if conflicts.filter(start_at__lt=end_at, end_at__gt=start_at).exists():
        raise ValidationError({"employee": "Employee already has an overlapping shift."})

    rest_window_start = start_at - MIN_REST
    rest_window_end = end_at + MIN_REST
    nearby = conflicts.filter(start_at__lt=rest_window_end, end_at__gt=rest_window_start)
    for existing in nearby:
        if existing.end_at <= start_at and start_at - existing.end_at < MIN_REST:
            raise ValidationError({"start_at": "Minimum 10-hour rest after the previous shift is required."})
        if existing.start_at >= end_at and existing.start_at - end_at < MIN_REST:
            raise ValidationError({"end_at": "Minimum 10-hour rest before the next shift is required."})

    week_start_date = start_at.date() - timedelta(days=start_at.weekday())
    week_start = timezone.make_aware(datetime.combine(week_start_date, time.min), timezone.get_current_timezone())
    week_end = week_start + timedelta(days=7)
    scheduled = 0
    for shift in conflicts.filter(start_at__lt=week_end, end_at__gt=week_start):
        scheduled += _overlap_hours(shift.start_at, shift.end_at, week_start, week_end)
    scheduled += _overlap_hours(start_at, end_at, week_start, week_end)
    if scheduled > employee.max_weekly_hours:
        raise ValidationError({"employee": f"Shift would exceed the {employee.max_weekly_hours}-hour weekly limit."})


@transaction.atomic
def create_shift(*, employee_id, department_id, start_at, end_at, status, assignment_source, required_skills, roster_id=None):
    employee = Employee.objects.select_for_update().select_related("department").get(pk=employee_id)
    from departments.models import Department

    department = Department.objects.get(pk=department_id)
    if status != Shift.Status.DRAFT:
        raise ValidationError({"status": "New shifts must start as drafts; publication is a separate approval workflow."})
    validate_shift(
        employee=employee, department=department, start_at=start_at, end_at=end_at,
        required_skills=required_skills,
    )
    return Shift.objects.create(
        roster_id=roster_id,
        employee=employee, department=department, start_at=start_at, end_at=end_at,
        status=status, assignment_source=assignment_source, required_skills=required_skills,
    )


@transaction.atomic
def update_shift(shift, *, employee_id, department_id, start_at, end_at, status, assignment_source, required_skills):
    locked = Shift.objects.select_for_update().get(pk=shift.pk)
    if locked.status == Shift.Status.PUBLISHED:
        raise ValidationError({"status": "Published shifts require an approved change workflow."})
    if locked.status in (Shift.Status.COMPLETED, Shift.Status.CANCELLED):
        raise ValidationError({"status": "Completed or cancelled shifts cannot be changed."})
    employee = Employee.objects.select_for_update().select_related("department").get(pk=employee_id)
    from departments.models import Department

    department = Department.objects.get(pk=department_id)
    if status == Shift.Status.CANCELLED and locked.status == Shift.Status.DRAFT:
        locked.status = Shift.Status.CANCELLED
        locked.save(update_fields=["status", "updated_at"])
        return locked
    if status != Shift.Status.DRAFT:
        raise ValidationError({"status": "Only draft shifts can be edited through this endpoint."})
    validate_shift(
        employee=employee, department=department, start_at=start_at, end_at=end_at,
        required_skills=required_skills, exclude_pk=locked.pk,
    )
    locked.employee = employee
    locked.department = department
    locked.start_at = start_at
    locked.end_at = end_at
    locked.status = status
    locked.assignment_source = assignment_source
    locked.required_skills = required_skills
    locked.save()
    return locked
