from datetime import datetime, time, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from occupancy.models import OccupancyRecord
from scheduling.models import Shift
from .models import StaffingRule
from .services import estimate_department_staffing
from .serializers import StaffingRuleSerializer


class StaffingRuleViewSet(viewsets.ModelViewSet):
    queryset = StaffingRule.objects.select_related("department")
    serializer_class = StaffingRuleSerializer
    permission_classes = [IsAdminUser]


class DemandEstimationView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        requested_date = parse_date(request.query_params.get("date", ""))
        if not requested_date:
            raise ValidationError({"date": "Provide a valid date in YYYY-MM-DD format."})
        try:
            occupancy = OccupancyRecord.objects.get(date=requested_date)
        except OccupancyRecord.DoesNotExist as exc:
            raise NotFound("No occupancy record exists for this date.") from exc

        day_start = timezone.make_aware(
            datetime.combine(requested_date, time.min), timezone.get_current_timezone()
        )
        day_end = day_start + timedelta(days=1)
        results = []
        for requirement in estimate_department_staffing(occupancy):
            rule = requirement["rule"]
            required = requirement["required_staff"]
            scheduled = Shift.objects.filter(
                department=rule.department,
                status__in=[Shift.Status.DRAFT, Shift.Status.PUBLISHED],
                start_at__lt=day_end,
                end_at__gt=day_start,
            ).values("employee_id").distinct().count()
            results.append({
                "department_id": rule.department_id,
                "department": rule.department.name,
                "required_staff": required,
                "scheduled_staff": scheduled,
                "shortage": max(required - scheduled, 0),
                "surplus": max(scheduled - required, 0),
            })
        return Response({
            "date": requested_date,
            "source": "deterministic_configured_ratios",
            "occupancy": {
                "total_rooms": occupancy.total_rooms,
                "occupied_rooms": occupancy.occupied_rooms,
                "occupancy_rate_percent": round(occupancy.occupancy_rate * 100, 1),
                "expected_check_ins": occupancy.expected_check_ins,
                "expected_check_outs": occupancy.expected_check_outs,
            },
            "departments": results,
        })
