
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import OccupancyRecord, Room


class OccupancyRecordSerializer(serializers.ModelSerializer):
    occupancy_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = OccupancyRecord
        fields = [
            "id",
            "date",
            "total_rooms",
            "occupied_rooms",
            "expected_check_ins",
            "expected_check_outs",
            "notes",
            "occupancy_rate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = self.instance
        data = {
            "date": attrs.get("date", getattr(instance, "date", None)),
            "total_rooms": attrs.get(
                "total_rooms", getattr(instance, "total_rooms", None)
            ),
            "occupied_rooms": attrs.get(
                "occupied_rooms", getattr(instance, "occupied_rooms", None)
            ),
            "expected_check_ins": attrs.get(
                "expected_check_ins",
                getattr(instance, "expected_check_ins", 0),
            ),
            "expected_check_outs": attrs.get(
                "expected_check_outs",
                getattr(instance, "expected_check_outs", 0),
            ),
        }

        if None not in data.values():
            try:
                OccupancyRecord(**data).full_clean()
            except DjangoValidationError as exc:
                raise serializers.ValidationError(
                    getattr(exc, "message_dict", exc.messages)
                ) from exc

        return attrs


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = [
            "id",
            "room_number",
            "floor",
            "room_type",
            "status",
            "assigned_to",
            "last_inspected",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
