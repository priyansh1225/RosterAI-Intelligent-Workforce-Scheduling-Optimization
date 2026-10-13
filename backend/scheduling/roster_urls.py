from rest_framework.routers import DefaultRouter

from .roster_views import RosterViewSet

router = DefaultRouter()
router.register("", RosterViewSet, basename="roster")

urlpatterns = router.urls
