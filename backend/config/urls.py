"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""



from django.contrib import admin
from django.urls import include, path
from forecasting.views import DemandEstimationView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/departments/", include("departments.urls")),
    path("api/employees/", include("employees.urls")),
    path("api/shifts/", include("scheduling.urls")),
    path("api/rosters/", include("scheduling.roster_urls")),
    path("api/occupancy/", include("occupancy.urls")),
    path("api/forecasting/", include("forecasting.urls")),
    path("api/demand/", DemandEstimationView.as_view(), name="demand-estimation"),
]

