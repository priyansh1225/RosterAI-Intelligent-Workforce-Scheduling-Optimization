
from django.db import models


class Task(models.Model):
    STATUS_CHOICES = [
        ("ASSIGNED", "Assigned"),
        ("ACCEPTED", "Accepted"),
        ("IN_PROGRESS", "In Progress"),
        ("SUBMITTED_FOR_VERIFICATION", "Submitted for Verification"),
        ("VERIFIED_COMPLETED", "Verified Completed"),
    ]

    PRIORITY_CHOICES = [
        ("LOW", "Low"),
        ("NORMAL", "Normal"),
        ("HIGH", "High"),
        ("URGENT", "Urgent"),
    ]

    title = models.CharField(max_length=200)
    department = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True)
    assigned_to = models.CharField(max_length=150, blank=True)
    employee_id = models.IntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=40,
        choices=STATUS_CHOICES,
        default="ASSIGNED",
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default="NORMAL",
    )
    deadline = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    history = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return f"{self.title} ({self.status})"
