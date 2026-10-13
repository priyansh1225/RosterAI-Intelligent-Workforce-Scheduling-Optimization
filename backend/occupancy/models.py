
from django.core.exceptions import ValidationError
from django.db import models


class OccupancyRecord(models.Model):
    date = models.DateField(unique=True)
    total_rooms = models.PositiveIntegerField()
    occupied_rooms = models.PositiveIntegerField()
    expected_check_ins = models.PositiveIntegerField(default=0)
    expected_check_outs = models.PositiveIntegerField(default=0)
    notes = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date"]

    def clean(self):
        if self.total_rooms < 1:
            raise ValidationError({
                "total_rooms": "Total rooms must be at least one."
            })

        if self.occupied_rooms > self.total_rooms:
            raise ValidationError({
                "occupied_rooms": "Occupied rooms cannot exceed total rooms."
            })

    @property
    def occupancy_rate(self):
        return (
            self.occupied_rooms / self.total_rooms
            if self.total_rooms
            else 0
        )

    def __str__(self):
        return (
            f"{self.date}: "
            f"{self.occupied_rooms}/{self.total_rooms} rooms"
        )


class Room(models.Model):
    STATUS_CHOICES = [
        ("ROOM_READY", "Room Ready"),
        ("IN_PROGRESS", "In Progress"),
        ("AWAITING_VERIFICATION", "Awaiting Verification"),
        ("REQUEST_CREATED", "Request Created"),
        ("STAFF_ASSIGNED", "Staff Assigned"),
    ]

    room_number = models.CharField(max_length=20, unique=True)
    floor = models.PositiveIntegerField(default=1)
    room_type = models.CharField(max_length=100)
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="ROOM_READY",
    )
    assigned_to = models.CharField(
        max_length=150,
        blank=True,
        null=True,
    )
    last_inspected = models.CharField(
        max_length=50,
        default="None",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["floor", "room_number"]

    def __str__(self):
        
        return f"Room {self.room_number} - {self.status}"
