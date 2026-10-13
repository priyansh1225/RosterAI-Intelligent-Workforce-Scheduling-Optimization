
from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    task_code = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = "__all__"
        extra_kwargs = {
            "history": {"required": False},
        }

    def get_task_code(self, obj):
        return f"TSK-{200 + obj.pk}"

    def create(self, validated_data):
        validated_data.setdefault("history", [])
        return super().create(validated_data)
