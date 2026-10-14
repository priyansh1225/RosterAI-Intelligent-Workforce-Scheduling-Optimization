
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import (
    Employee,
    EmployeeAvailability,
    LeaveRequest,
    StaffRequest,
)


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_code",
            "full_name",
            "email",
            "phone",
            "department",
            "department_name",
            "skills",
            "is_available",
            "employment_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"skills": {"required": False}}

    def validate_skills(self, value):
        if not isinstance(value, list) or any(
            not isinstance(skill, str) or not skill.strip()
            for skill in value
        ):
            raise serializers.ValidationError(
                "Skills must be a list of non-empty strings."
            )
        return list(dict.fromkeys(skill.strip() for skill in value))

    def validate_department(self, department):
        if not department.is_active:
            raise serializers.ValidationError(
                "Employees cannot be assigned to an inactive department."
            )
        return department


class EmployeeAvailabilitySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.full_name",
        read_only=True,
    )
    employee_code = serializers.CharField(
        source="employee.employee_code",
        read_only=True,
    )

    class Meta:
        model = EmployeeAvailability
        fields = [
            "id", "employee", "employee_name", "employee_code",
            "date", "start_time", "end_time", "status", "reason",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = self.instance
        employee = attrs.get(
            "employee", getattr(instance, "employee", None)
        )
        date = attrs.get("date", getattr(instance, "date", None))
        start = attrs.get(
            "start_time", getattr(instance, "start_time", None)
        )
        end = attrs.get("end_time", getattr(instance, "end_time", None))
        status = attrs.get("status", getattr(instance, "status", None))

        if employee and employee.employment_status != Employee.EmploymentStatus.ACTIVE:
            raise serializers.ValidationError({
                "employee": "Inactive employees cannot record availability."
            })

        if employee and not employee.department.is_active:
            raise serializers.ValidationError({
                "employee": "Employees in inactive departments cannot record availability."
            })

        candidate = EmployeeAvailability(
            employee=employee,
            date=date,
            start_time=start,
            end_time=end,
            status=status,
            reason=attrs.get(
                "reason", getattr(instance, "reason", "")
            ),
        )

        try:
            candidate.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                getattr(exc, "message_dict", exc.messages)
            ) from exc

        if employee and date and status == EmployeeAvailability.Status.AVAILABLE:
            if LeaveRequest.objects.filter(
                employee=employee,
                status=LeaveRequest.Status.APPROVED,
                start_date__lte=date,
                end_date__gte=date,
            ).exists():
                raise serializers.ValidationError({
                    "status": "Employee has approved leave on this date."
                })

            conflicts = EmployeeAvailability.objects.filter(
                employee=employee,
                date=date,
                status=EmployeeAvailability.Status.UNAVAILABLE,
            ).exclude(pk=getattr(instance, "pk", None))

            candidate_start = (
                start.hour * 60 + start.minute if start else 0
            )
            candidate_end = (
                end.hour * 60 + end.minute if end else 1440
            )

            if start and end and end < start:
                candidate_end += 1440

            for record in conflicts:
                if not start or not end or not record.start_time or not record.end_time:
                    raise serializers.ValidationError(
                        "Available and unavailable records conflict for this date."
                    )

                conflict_start = (
                    record.start_time.hour * 60 + record.start_time.minute
                )
                conflict_end = (
                    record.end_time.hour * 60 + record.end_time.minute
                )

                if record.end_time < record.start_time:
                    conflict_end += 1440

                intervals = [(conflict_start, conflict_end)]

                if conflict_end > 1440:
                    intervals.append((0, conflict_end - 1440))

                if candidate_end > 1440:
                    candidate_intervals = [
                        (candidate_start, 1440),
                        (0, candidate_end - 1440),
                    ]
                else:
                    candidate_intervals = [(candidate_start, candidate_end)]

                if any(
                    a < d and c < b
                    for a, b in candidate_intervals
                    for c, d in intervals
                ):
                    raise serializers.ValidationError(
                        "Availability overlaps an unavailable time window."
                    )

        return attrs


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.full_name",
        read_only=True,
    )
    employee_code = serializers.CharField(
        source="employee.employee_code",
        read_only=True,
    )

    class Meta:
        model = LeaveRequest
        fields = [
            "id", "employee", "employee_name", "employee_code",
            "start_date", "end_date", "reason", "status",
            "decision_note", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "decision_note",
            "created_at", "updated_at",
        ]

    def to_internal_value(self, data):
        if "status" in data or "decision_note" in data:
            raise serializers.ValidationError({
                "status": "Leave decisions are not available through this endpoint yet."
            })
        return super().to_internal_value(data)

    def validate(self, attrs):
        instance = self.instance
        employee = attrs.get(
            "employee", getattr(instance, "employee", None)
        )
        start = attrs.get(
            "start_date", getattr(instance, "start_date", None)
        )
        end = attrs.get(
            "end_date", getattr(instance, "end_date", None)
        )
        status = attrs.get(
            "status", getattr(instance, "status", LeaveRequest.Status.PENDING)
        )
        reason = attrs.get(
            "reason", getattr(instance, "reason", "")
        )

        if employee and employee.employment_status != Employee.EmploymentStatus.ACTIVE:
            raise serializers.ValidationError({
                "employee": "Inactive employees cannot submit leave requests."
            })

        if employee and not employee.department.is_active:
            raise serializers.ValidationError({
                "employee": "Employees in inactive departments cannot submit leave requests."
            })

        candidate = LeaveRequest(
            employee=employee,
            start_date=start,
            end_date=end,
            status=status,
            reason=reason,
            decision_note=attrs.get(
                "decision_note", getattr(instance, "decision_note", "")
            ),
        )

        try:
            candidate.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                getattr(exc, "message_dict", exc.messages)
            ) from exc

        return attrs


class StaffRequestSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

    class Meta:
        model = StaffRequest
        fields = [
            "id",
            "request_code",
            "department",
            "department_name",
            "location",
            "task_type",
            "required_count",
            "assigned_count",
            "assigned_staff",
            "required_skills",
            "priority",
            "duration_minutes",
            "deadline",
            "status",
            "reason",
            "shortage_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "request_code", "assigned_count",
            "assigned_staff", "status", "shortage_reason",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        required_count = attrs.get(
            "required_count",
            getattr(self.instance, "required_count", 1),
        )

        if required_count < 1:
            raise serializers.ValidationError({
                "required_count": "At least one staff member is required."
            })

        department = attrs.get(
            "department",
            getattr(self.instance, "department", None),
        )

        if department and not department.is_active:
            raise serializers.ValidationError({
                "department": "Staff requests cannot target an inactive department."
            })

        skills = attrs.get(
            "required_skills",
            getattr(self.instance, "required_skills", []),
        )

        if not isinstance(skills, list) or any(
            not isinstance(skill, str) or not skill.strip()
            for skill in skills
        ):
            raise serializers.ValidationError({
                "required_skills": "Skills must be a list of non-empty strings."
            })

        attrs["required_skills"] = list(
            dict.fromkeys(skill.strip() for skill in skills)
        )

        return attrs
