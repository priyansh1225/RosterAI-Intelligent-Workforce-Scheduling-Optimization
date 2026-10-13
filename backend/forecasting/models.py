from django.core.exceptions import ValidationError
from django.db import models
from datetime import time


class StaffingRule(models.Model):
    department = models.OneToOneField(
        "departments.Department", on_delete=models.PROTECT, related_name="staffing_rule"
    )
    employees_per_occupied_room = models.DecimalField(max_digits=7, decimal_places=5, default=0)
    employees_per_check_in = models.DecimalField(max_digits=7, decimal_places=5, default=0)
    employees_per_check_out = models.DecimalField(max_digits=7, decimal_places=5, default=0)
    minimum_staff = models.PositiveSmallIntegerField(default=0)
    required_skills = models.JSONField(default=list, blank=True)
    shift_start_time = models.TimeField(default=time(9))
    shift_end_time = models.TimeField(default=time(17))
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["department__name"]

    def clean(self):
        for field in ("employees_per_occupied_room", "employees_per_check_in", "employees_per_check_out"):
            if getattr(self, field) < 0:
                raise ValidationError({field: "Staffing ratios cannot be negative."})
        if self.shift_start_time == self.shift_end_time:
            raise ValidationError({"shift_end_time": "Configured shift start and end must differ."})
        if not isinstance(self.required_skills, list) or any(
            not isinstance(skill, str) or not skill.strip() for skill in self.required_skills
        ):
            raise ValidationError({"required_skills": "Required skills must be a list of non-empty strings."})

    def __str__(self):
        return f"Staffing rule — {self.department.name}"
