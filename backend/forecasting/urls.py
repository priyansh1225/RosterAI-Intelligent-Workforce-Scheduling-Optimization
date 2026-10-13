from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import StaffingRuleViewSet

router = DefaultRouter()
router.register("staffing-rules", StaffingRuleViewSet, basename="staffing-rule")

urlpatterns = [
    path("", include(router.urls)),
]
