
from datetime import timedelta

from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Shift
from .serializers import ShiftSerializer


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.select_related("employee", "department")
    serializer_class = ShiftSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        department = self.request.query_params.get("department")
        employee = self.request.query_params.get("employee")

        if department:
            queryset = queryset.filter(department_id=department)

        if employee:
            queryset = queryset.filter(employee_id=employee)

        return queryset

    @action(detail=False, methods=["get"])
    def daily(self, request):
        requested_date = parse_date(request.query_params.get("date", ""))

        if not requested_date:
            raise ValidationError({
                "date": "Provide a valid date in YYYY-MM-DD format."
            })

        day_start = requested_date
        day_end = requested_date + timedelta(days=1)

        shifts = self.get_queryset().filter(
            start_at__date__lt=day_end,
            end_at__date__gte=day_start,
        )

        return Response(self.get_serializer(shifts, many=True).data)

    @action(detail=False, methods=["get"])
    def weekly(self, request):
        requested_date = parse_date(request.query_params.get("date", ""))

        if not requested_date:
            raise ValidationError({
                "date": "Provide a valid date in YYYY-MM-DD format."
            })

        monday = requested_date - timedelta(days=requested_date.weekday())
        sunday = monday + timedelta(days=7)

        shifts = self.get_queryset().filter(
            start_at__date__lt=sunday,
            end_at__date__gte=monday,
        )

        return Response(self.get_serializer(shifts, many=True).data)
