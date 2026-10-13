
from datetime import datetime, timedelta

from django.utils.dateparse import parse_date, parse_time
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from .models import Employee, EmployeeAvailability, LeaveRequest
from .serializers import (
    EmployeeAvailabilitySerializer,
    EmployeeSerializer,
    LeaveRequestSerializer,
)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("department").all()
    serializer_class = EmployeeSerializer

    @action(detail=False, methods=["get"], permission_classes=[IsAdminUser])
    def eligible(self, request):
        requested_date = parse_date(request.query_params.get("date", ""))
        if not requested_date:
            raise ValidationError({"date": "Provide a valid date in YYYY-MM-DD format."})
        start = parse_time(request.query_params.get("start_time", ""))
        end = parse_time(request.query_params.get("end_time", ""))
        if (request.query_params.get("start_time") or request.query_params.get("end_time")) and (not start or not end or end == start):
            raise ValidationError({"start_time": "Provide a valid start_time and a different end_time."})
        required_skills = {
            skill.strip().casefold()
            for skill in request.query_params.get("skills", "").split(",")
            if skill.strip()
        }
        employees = self.get_queryset().filter(
            employment_status=Employee.EmploymentStatus.ACTIVE,
            is_available=True,
            department__is_active=True,
            availability_records__date=requested_date,
            availability_records__status=EmployeeAvailability.Status.AVAILABLE,
        ).distinct()
        if department_id := request.query_params.get("department"):
            employees = employees.filter(department_id=department_id)
        available_employees = []
        for employee in employees:
            if not required_skills.issubset({s.casefold() for s in employee.skills if isinstance(s, str)}):
                continue
            if LeaveRequest.objects.filter(
                employee=employee, status=LeaveRequest.Status.APPROVED,
                start_date__lte=requested_date, end_date__gte=requested_date,
            ).exists():
                continue
            records = employee.availability_records.filter(
                date=requested_date, status=EmployeeAvailability.Status.AVAILABLE
            )
            requested_start = datetime.combine(requested_date, start) if start else None
            requested_end = datetime.combine(requested_date, end) if end else None
            if start and end and end < start:
                requested_end += timedelta(days=1)
            covers = False
            for record in records:
                if record.start_time is None:
                    covers = True
                    break
                available_start = datetime.combine(record.date, record.start_time)
                available_end = datetime.combine(record.date, record.end_time)
                if record.end_time < record.start_time:
                    available_end += timedelta(days=1)
                if start and end:
                    if available_start <= requested_start and requested_end <= available_end:
                        covers = True
                        break
                elif available_start.date() == requested_date:
                    covers = True
                    break
            if covers:
                available_employees.append(employee)
        employees = available_employees
        return Response(self.get_serializer(employees, many=True).data)


class EmployeeAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = EmployeeAvailability.objects.select_related("employee", "employee__department")
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
    queryset = LeaveRequest.objects.select_related("employee", "employee__department")
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
