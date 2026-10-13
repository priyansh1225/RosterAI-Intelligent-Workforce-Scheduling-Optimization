from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q


class Shift(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    class AssignmentSource(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        RULES = "RULES", "Rules based"

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.PROTECT, related_name="shifts"
    )
    roster = models.ForeignKey(
        "scheduling.Roster", on_delete=models.SET_NULL, related_name="shifts",
        null=True, blank=True,
    )
    department = models.ForeignKey(
        "departments.Department", on_delete=models.PROTECT, related_name="shifts"
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    assignment_source = models.CharField(
        max_length=10, choices=AssignmentSource.choices, default=AssignmentSource.MANUAL
    )
    required_skills = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_at", "department__name", "employee__full_name"]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_at__gt=F("start_at")), name="shift_end_after_start"
            ),
        ]
        indexes = [
            models.Index(fields=["start_at", "end_at"]),
            models.Index(fields=["department", "start_at"]),
            models.Index(fields=["employee", "start_at"]),
        ]

    def clean(self):
        if self.start_at and self.end_at and self.end_at <= self.start_at:
            raise ValidationError({"end_at": "Shift end must be after shift start."})

    def __str__(self):
        return f"{self.employee} — {self.start_at} to {self.end_at}"


class Roster(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        APPROVED = "APPROVED", "Approved"
        PUBLISHED = "PUBLISHED", "Published"

    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    shortage_summary = models.JSONField(default=list, blank=True)
    approval_note = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_rosters",
    )
    reviewed_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reviewed_rosters",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.date} roster ({self.status})"
