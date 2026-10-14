
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EmployeeAvailabilityViewSet,
    EmployeeViewSet,
    LeaveRequestViewSet,
    StaffRequestViewSet,
)

router = DefaultRouter()
router.register("", EmployeeViewSet, basename="employee")

availability_router = DefaultRouter()
availability_router.register(
    "",
    EmployeeAvailabilityViewSet,
    basename="availability",
)

leave_router = DefaultRouter()
leave_router.register(
    "",
    LeaveRequestViewSet,
    basename="leave-request",
)

staff_request_router = DefaultRouter()
staff_request_router.register(
    "",
    StaffRequestViewSet,
    basename="staff-request",
)

urlpatterns = [
    path("availability/", include(availability_router.urls)),
    path("leave-requests/", include(leave_router.urls)),
    path("staff-requests/", include(staff_request_router.urls)),
    path("", include(router.urls)),
]
