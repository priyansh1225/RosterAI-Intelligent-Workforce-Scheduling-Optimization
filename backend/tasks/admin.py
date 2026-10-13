
from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "department",
        "assigned_to",
        "status",
        "priority",
        "created_at",
    )

    list_filter = ("department", "status", "priority")
    search_fields = ("title", "assigned_to", "location")
    readonly_fields = ("created_at",)
