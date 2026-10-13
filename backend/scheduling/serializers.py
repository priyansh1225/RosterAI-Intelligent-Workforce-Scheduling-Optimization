from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from employees.models import Employee
from .models import Shift
from .services import create_shift, update_shift


class ShiftSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Shift
        fields = [
            "id", "employee", "employee_name", "department", "department_name",
            "start_at", "end_at", "status", "assignment_source", "required_skills",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_required_skills(self, value):
        if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
            raise serializers.ValidationError("Required skills must be a list of non-empty strings.")
        return list(dict.fromkeys(item.strip() for item in value))

    def validate(self, attrs):
        employee = attrs.get("employee", getattr(self.instance, "employee", None))
        department = attrs.get("department", getattr(self.instance, "department", None))
        if department and not department.is_active:
            raise serializers.ValidationError({"department": "Inactive departments cannot receive shifts."})
        if employee and employee.employment_status != Employee.EmploymentStatus.ACTIVE:
            raise serializers.ValidationError({"employee": "Inactive employees cannot be assigned shifts."})
        return attrs

    def create(self, validated_data):
        try:
            return create_shift(
                employee_id=validated_data["employee"].pk,
                department_id=validated_data["department"].pk,
                start_at=validated_data["start_at"],
                end_at=validated_data["end_at"],
                status=validated_data.get("status", Shift.Status.DRAFT),
                assignment_source=validated_data.get("assignment_source", Shift.AssignmentSource.MANUAL),
                required_skills=validated_data.get("required_skills", []),
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(getattr(exc, "message_dict", exc.messages)) from exc

    def update(self, instance, validated_data):
        data = {
            "employee_id": validated_data.get("employee", instance.employee).pk,
            "department_id": validated_data.get("department", instance.department).pk,
            "start_at": validated_data.get("start_at", instance.start_at),
            "end_at": validated_data.get("end_at", instance.end_at),
            "status": validated_data.get("status", instance.status),
            "assignment_source": validated_data.get("assignment_source", instance.assignment_source),
            "required_skills": validated_data.get("required_skills", instance.required_skills),
        }
        try:
            return update_shift(instance, **data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(getattr(exc, "message_dict", exc.messages)) from exc
