
from rest_framework.routers import DefaultRouter
from django.urls import include, path
from .views import EmployeeAvailabilityViewSet, EmployeeViewSet, LeaveRequestViewSet

router = DefaultRouter()
router.register("", EmployeeViewSet, basename="employee")
availability_router = DefaultRouter()
availability_router.register("", EmployeeAvailabilityViewSet, basename="availability")
leave_router = DefaultRouter()
leave_router.register("", LeaveRequestViewSet, basename="leave-request")

urlpatterns = [
    path("availability/", include(availability_router.urls)),
    path("leave-requests/", include(leave_router.urls)),
    path("", include(router.urls)),
]
