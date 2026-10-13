
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.dateparse import parse_date

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from departments.models import Department
from .models import Roster
from .roster_serializers import RosterSerializer
from .roster_services import (
    approve_roster,
    generate_draft_roster,
    publish_roster,
)


class RosterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Roster.objects.prefetch_related(
        "shifts__employee",
        "shifts__department",
    )
    serializer_class = RosterSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()

        date_param = self.request.query_params.get("date")
        requested_date = parse_date(date_param) if date_param else None

        status_filter = self.request.query_params.get("status")

        if requested_date:
            queryset = queryset.filter(date=requested_date)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    @action(detail=False, methods=["post"])
    def generate(self, request):
        requested_date = parse_date(request.data.get("date", ""))

        if not requested_date:
            raise ValidationError({
                "date": "Provide a valid date in YYYY-MM-DD format."
            })

        department_id = request.data.get("department")

        if department_id:
            try:
                department = Department.objects.get(
                    pk=department_id,
                    is_active=True,
                )
            except (Department.DoesNotExist, ValueError, TypeError) as exc:
                raise ValidationError({
                    "department": "Select an active department."
                }) from exc

            if (
                not hasattr(department, "staffing_rule")
                or not department.staffing_rule.is_active
            ):
                raise ValidationError({
                    "department": (
                        "Configure an active staffing rule "
                        "before generating a roster."
                    )
                })

        try:
            roster = generate_draft_roster(
                day=requested_date,
                created_by=request.user,
                department_id=int(department_id) if department_id else None,
            )
        except (DjangoValidationError, ValueError, TypeError) as exc:
            detail = getattr(exc, "message_dict", None)
            if detail is None:
                detail = getattr(exc, "messages", [str(exc)])
            raise ValidationError(detail) from exc

        return Response(
            self.get_serializer(roster).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        note = request.data.get("approval_note", "")

        if not isinstance(note, str):
            raise ValidationError({
                "approval_note": "Approval note must be text."
            })

        try:
            roster = approve_roster(
                roster_id=pk,
                reviewer=request.user,
                note=note,
            )
        except DjangoValidationError as exc:
            detail = getattr(exc, "message_dict", None)
            if detail is None:
                detail = getattr(exc, "messages", [str(exc)])
            raise ValidationError(detail) from exc

        return Response(self.get_serializer(roster).data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        try:
            roster = publish_roster(roster_id=pk)
        except DjangoValidationError as exc:
            detail = getattr(exc, "message_dict", None)
            if detail is None:
                detail = getattr(exc, "messages", [str(exc)])
            raise ValidationError(detail) from exc

        return Response(self.get_serializer(roster).data)
