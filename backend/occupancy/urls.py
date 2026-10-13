from rest_framework.routers import DefaultRouter

from .views import OccupancyRecordViewSet

router = DefaultRouter()
router.register("", OccupancyRecordViewSet, basename="occupancy")

urlpatterns = router.urls
