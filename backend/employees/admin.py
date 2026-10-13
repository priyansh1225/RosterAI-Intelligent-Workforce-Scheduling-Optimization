from django.contrib import admin
from .models import Employee, EmployeeAvailability, LeaveRequest


admin.site.register(Employee)
admin.site.register(EmployeeAvailability)
admin.site.register(LeaveRequest)
