from datetime import time

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import StaffingRule


class StaffingRuleSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = StaffingRule
        fields = [
            "id", "department", "department_name", "employees_per_occupied_room",
            "employees_per_check_in", "employees_per_check_out", "minimum_staff",
            "required_skills", "shift_start_time", "shift_end_time", "is_active", "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate(self, attrs):
        instance = self.instance
        department = attrs.get("department", getattr(instance, "department", None))
        if department and not department.is_active:
            raise serializers.ValidationError({"department": "Inactive departments cannot have active staffing rules."})
        data = {
            "department": department,
            "employees_per_occupied_room": attrs.get("employees_per_occupied_room", getattr(instance, "employees_per_occupied_room", 0)),
            "employees_per_check_in": attrs.get("employees_per_check_in", getattr(instance, "employees_per_check_in", 0)),
            "employees_per_check_out": attrs.get("employees_per_check_out", getattr(instance, "employees_per_check_out", 0)),
            "minimum_staff": attrs.get("minimum_staff", getattr(instance, "minimum_staff", 0)),
            "required_skills": attrs.get("required_skills", getattr(instance, "required_skills", [])),
            "shift_start_time": attrs.get("shift_start_time", getattr(instance, "shift_start_time", time(9))),
            "shift_end_time": attrs.get("shift_end_time", getattr(instance, "shift_end_time", time(17))),
        }
        skills = data["required_skills"]
        if not isinstance(skills, list) or any(not isinstance(skill, str) or not skill.strip() for skill in skills):
            raise serializers.ValidationError({"required_skills": "Required skills must be a list of non-empty strings."})
        try:
            StaffingRule(**data).full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(getattr(exc, "message_dict", exc.messages)) from exc
        return attrs
from datetime import time

