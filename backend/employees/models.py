
from django.db import models
from departments.models import Department


class Employee(models.Model):
    class EmploymentStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    employee_code = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="employees",
    )


    skills = models.JSONField(default=list, blank=True)
    is_available = models.BooleanField(default=True)
    max_weekly_hours = models.PositiveSmallIntegerField(default=40)
    employment_status = models.CharField(
        max_length=10,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.employee_code} - {self.full_name}"


class EmployeeAvailability(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        UNAVAILABLE = "UNAVAILABLE", "Unavailable"
        ON_LEAVE = "ON_LEAVE", "On leave"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="availability_records"
    )
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "start_time", "employee__full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "date", "start_time", "end_time"],
                name="unique_employee_availability_window",
            ),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.start_time and self.end_time and self.end_time == self.start_time:
            raise ValidationError({"end_time": "Availability cannot have identical start and end times."})
        if (self.start_time is None) != (self.end_time is None):
            raise ValidationError("Provide both start_time and end_time, or neither.")

    def __str__(self):
        return f"{self.employee} — {self.date} ({self.status})"


class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_requests"
    )
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    decision_note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date must not precede start date."})
        if self.employee_id and self.status == self.Status.APPROVED:
            overlapping = LeaveRequest.objects.filter(
                employee_id=self.employee_id,
                status=self.Status.APPROVED,
                start_date__lte=self.end_date,
                end_date__gte=self.start_date,
            ).exclude(pk=self.pk)
            if overlapping.exists():
                raise ValidationError("Approved leave dates cannot overlap.")

    def __str__(self):
        return f"{self.employee} — {self.start_date} to {self.end_date}"


class StaffRequest(models.Model):
    class Status(models.TextChoices):
        FULFILLED = "FULFILLED", "Fulfilled"
        PARTIAL = "PARTIAL", "Partially Fulfilled"
        SHORTAGE = "SHORTAGE", "Staff Shortage"

    request_code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="staff_requests",
    )
    location = models.CharField(max_length=200)
    task_type = models.CharField(max_length=150)
    required_count = models.PositiveIntegerField(default=1)
    assigned_count = models.PositiveIntegerField(default=0)
    assigned_staff = models.JSONField(default=list, blank=True)
    required_skills = models.JSONField(default=list, blank=True)
    priority = models.CharField(
        max_length=10,
        choices=[
            ("LOW", "Low"),
            ("NORMAL", "Normal"),
            ("HIGH", "High"),
            ("URGENT", "Urgent"),
        ],
        default="NORMAL",
    )
    duration_minutes = models.PositiveIntegerField(default=60)
    deadline = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.SHORTAGE,
    )
    reason = models.CharField(max_length=255, blank=True)
    shortage_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.request_code} - {self.task_type}"
