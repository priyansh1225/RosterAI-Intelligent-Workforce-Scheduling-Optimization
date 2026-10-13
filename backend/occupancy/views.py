
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import OccupancyRecord, Room
from .serializers import OccupancyRecordSerializer, RoomSerializer


class OccupancyRecordViewSet(viewsets.ModelViewSet):
    queryset = OccupancyRecord.objects.all()
    serializer_class = OccupancyRecordSerializer
    permission_classes = [AllowAny]


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [AllowAny]
