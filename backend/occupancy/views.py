from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from .models import OccupancyRecord
from .serializers import OccupancyRecordSerializer


class OccupancyRecordViewSet(viewsets.ModelViewSet):
    queryset = OccupancyRecord.objects.all()
    serializer_class = OccupancyRecordSerializer
    permission_classes = [IsAdminUser]
