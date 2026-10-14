
from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_time

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.response import Response

from tasks.models import Task

from .models import (
    Employee,
    EmployeeAvailability,
    LeaveRequest,
    StaffRequest,
)

from .serializers import (
    EmployeeAvailabilitySerializer,
    EmployeeSerializer,
    LeaveRequestSerializer,
    StaffRequestSerializer,
)


def normalize_skill(skill):
    """Make 'Room cleaning' and 'room_cleaning' equivalent."""
    if not isinstance(skill, str):
        return ""
    return "_".join(skill.strip().casefold().replace("_", " ").split())


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("department").all()
    serializer_class = EmployeeSerializer

    @action(detail=False, methods=["get"], permission_classes=[IsAdminUser])
    def eligible(self, request):
        requested_date = parse_date(request.query_params.get("date", ""))

        if not requested_date:
            raise ValidationError({
                "date": "Provide a valid date in YYYY-MM-DD format."
            })

        start = parse_time(request.query_params.get("start_time", ""))
        end = parse_time(request.query_params.get("end_time", ""))

        if (
            request.query_params.get("start_time")
            or request.query_params.get("end_time")
        ) and (not start or not end or end == start):
            raise ValidationError({
                "start_time": "Provide valid start_time and end_time values."
            })

        required_skills = {
            normalize_skill(skill)
            for skill in request.query_params.get("skills", "").split(",")
            if normalize_skill(skill)
        }

        employees = Employee.objects.filter(
            employment_status=Employee.EmploymentStatus.ACTIVE,
            is_available=True,
            department__is_active=True,
            availability_records__date=requested_date,
            availability_records__status=EmployeeAvailability.Status.AVAILABLE,
        ).distinct()

        department_id = request.query_params.get("department")
        if department_id:
            employees = employees.filter(department_id=department_id)

        available_employees = []

        for employee in employees:
            employee_skills = {
                normalize_skill(skill)
                for skill in (employee.skills or [])
                if normalize_skill(skill)
            }

            if not required_skills.issubset(employee_skills):
                continue

            if LeaveRequest.objects.filter(
                employee=employee,
                status=LeaveRequest.Status.APPROVED,
                start_date__lte=requested_date,
                end_date__gte=requested_date,
            ).exists():
                continue

            records = employee.availability_records.filter(
                date=requested_date,
                status=EmployeeAvailability.Status.AVAILABLE,
            )

            requested_start = (
                datetime.combine(requested_date, start) if start else None
            )
            requested_end = (
                datetime.combine(requested_date, end) if end else None
            )

            if start and end and end < start:
                requested_end += timedelta(days=1)

            covers = False

            for record in records:
                if record.start_time is None:
                    covers = True
                    break

                if record.end_time is None:
                    continue

                available_start = datetime.combine(
                    record.date, record.start_time
                )
                available_end = datetime.combine(
                    record.date, record.end_time
                )

                if record.end_time < record.start_time:
                    available_end += timedelta(days=1)

                if start and end:
                    covers = (
                        available_start <= requested_start
                        and requested_end <= available_end
                    )
                else:
                    covers = True

                if covers:
                    break

            if covers:
                available_employees.append(employee)

        return Response(
            self.get_serializer(available_employees, many=True).data
        )


class EmployeeAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = EmployeeAvailability.objects.select_related(
        "employee", "employee__department"
    )
    serializer_class = EmployeeAvailabilitySerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()

        employee_id = self.request.query_params.get("employee")
        record_date = parse_date(self.request.query_params.get("date", ""))

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        if record_date:
            queryset = queryset.filter(date=record_date)

        return queryset


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related(
        "employee", "employee__department"
    )
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()

        employee_id = self.request.query_params.get("employee")
        status_filter = self.request.query_params.get("status")

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset


class StaffRequestViewSet(viewsets.ModelViewSet):
    queryset = StaffRequest.objects.select_related("department").all()
    serializer_class = StaffRequestSerializer
    permission_classes = [AllowAny]

    def _allocate_staff(self, staff_request):
        request_date = (
            timezone.localtime(staff_request.deadline).date()
            if staff_request.deadline
            else timezone.localdate()
        )

        assignments = list(staff_request.assigned_staff or [])

        assigned_ids = {
            item["employee_id"]
            for item in assignments
            if isinstance(item, dict) and item.get("employee_id") is not None
        }

        required_skills = {
            normalize_skill(skill)
            for skill in (staff_request.required_skills or [])
            if normalize_skill(skill)
        }

        candidates = Employee.objects.filter(
            department=staff_request.department,
            department__is_active=True,
            employment_status=Employee.EmploymentStatus.ACTIVE,
            is_available=True,
        ).exclude(id__in=assigned_ids).distinct()

        eligible = []

        for employee in candidates:
            if LeaveRequest.objects.filter(
                employee=employee,
                status=LeaveRequest.Status.APPROVED,
                start_date__lte=request_date,
                end_date__gte=request_date,
            ).exists():
                continue

            employee_skills = {
                normalize_skill(skill)
                for skill in (employee.skills or [])
                if normalize_skill(skill)
            }

            if not required_skills.issubset(employee_skills):
                continue

            availability_records = list(
                employee.availability_records.filter(date=request_date)
            )

            if availability_records and not any(
                record.status == EmployeeAvailability.Status.AVAILABLE
                for record in availability_records
            ):
                continue

            active_tasks = Task.objects.filter(
                employee_id=employee.id,
                status__in=[
                    "ASSIGNED",
                    "ACCEPTED",
                    "IN_PROGRESS",
                    "SUBMITTED_FOR_VERIFICATION",
                ],
            )

            if staff_request.deadline:
                active_tasks = active_tasks.filter(
                    deadline__date=request_date
                )

            if active_tasks.exists():
                continue

            eligible.append(
                (len(employee_skills & required_skills), employee)
            )

        eligible.sort(
            key=lambda item: (-item[0], item[1].full_name.casefold())
        )

        remaining = max(
            0, staff_request.required_count - len(assigned_ids)
        )

        selected = [employee for _, employee in eligible[:remaining]]

        for employee in selected:
            matched_skills = sorted(
                required_skills
                & {
                    normalize_skill(skill)
                    for skill in (employee.skills or [])
                    if normalize_skill(skill)
                }
            )

            Task.objects.create(
                title=staff_request.task_type,
                department=staff_request.department.name,
                location=staff_request.location,
                assigned_to=employee.full_name,
                employee_id=employee.id,
                status="ASSIGNED",
                priority=staff_request.priority,
                deadline=staff_request.deadline,
                notes=f"Automatically allocated from {staff_request.request_code}.",
                history=[{
                    "status": "ASSIGNED",
                    "note": f"Automatically assigned from {staff_request.request_code}.",
                    "timestamp": timezone.now().isoformat(),
                }],
            )

            assignments.append({
                "employee_id": employee.id,
                "employee_code": employee.employee_code,
                "full_name": employee.full_name,
                "department": staff_request.department.name,
                "skills_matched": matched_skills,
                "task_status": "ASSIGNED",
            })

        assigned_count = len({
            item["employee_id"]
            for item in assignments
            if isinstance(item, dict) and item.get("employee_id") is not None
        })

        if assigned_count >= staff_request.required_count:
            status = StaffRequest.Status.FULFILLED
            shortage_reason = ""
        elif assigned_count > 0:
            status = StaffRequest.Status.PARTIAL
            shortage_reason = (
                f"{staff_request.required_count - assigned_count} "
                "additional eligible employee(s) required."
            )
        else:
            status = StaffRequest.Status.SHORTAGE
            shortage_reason = "No eligible employees available for this request."

        staff_request.assigned_staff = assignments
        staff_request.assigned_count = assigned_count
        staff_request.status = status
        staff_request.shortage_reason = shortage_reason
        staff_request.save(update_fields=[
            "assigned_staff",
            "assigned_count",
            "status",
            "shortage_reason",
            "updated_at",
        ])

        return staff_request

    def perform_create(self, serializer):
        with transaction.atomic():
            last_request = (
                StaffRequest.objects
                .filter(request_code__startswith="REQ-")
                .order_by("-id")
                .first()
            )

            next_number = (last_request.id + 100) if last_request else 101

            staff_request = serializer.save(
                request_code=f"REQ-{next_number}"
            )

            self._allocate_staff(staff_request)

    @action(detail=True, methods=["post"])
    def allocate(self, request, pk=None):
        """Retry allocation for an existing staff request."""
        with transaction.atomic():
            staff_request = self.get_object()
            self._allocate_staff(staff_request)

        return Response(self.get_serializer(staff_request).data)
