from rest_framework import serializers

from .models import Roster
from .serializers import ShiftSerializer


class RosterSerializer(serializers.ModelSerializer):
    shifts = ShiftSerializer(many=True, read_only=True)

    class Meta:
        model = Roster
        fields = [
            "id", "date", "status", "shortage_summary", "approval_note",
            "created_by", "reviewed_by", "created_at", "reviewed_at", "published_at", "shifts",
        ]
        read_only_fields = fields
