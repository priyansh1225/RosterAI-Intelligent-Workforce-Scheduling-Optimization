from datetime import date, time

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from departments.models import Department
from .models import Employee, EmployeeAvailability, LeaveRequest


class EmployeeApiTests(APITestCase):
    def setUp(self):
        admin = get_user_model().objects.create_user(username="admin", password="test", is_staff=True)
        self.client.force_authenticate(user=admin)
        self.department = Department.objects.create(name="Housekeeping")
        self.employee = Employee.objects.create(
            employee_code="EMP001",
            full_name="Asha Sharma",
            email="asha@example.test",
            department=self.department,
            skills=["Room cleaning", "Laundry"],
        )

    def test_department_and_employee_crud_routes_remain_available(self):
        department_response = self.client.post(
            reverse("department-list"),
            {"name": "Front Desk", "description": "Guest services"},
            format="json",
        )
        self.assertEqual(department_response.status_code, status.HTTP_201_CREATED)

        response = self.client.get(reverse("employee-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["employee_code"], "EMP001")

        update = self.client.patch(
            reverse("employee-detail", args=[self.employee.pk]),
            {"phone": "555-0123"},
            format="json",
        )
        self.assertEqual(update.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.phone, "555-0123")

    def test_employee_skills_are_validated_and_normalized(self):
        invalid = self.client.patch(
            reverse("employee-detail", args=[self.employee.pk]),
            {"skills": ["Laundry", 42]},
            format="json",
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        valid = self.client.patch(
            reverse("employee-detail", args=[self.employee.pk]),
            {"skills": [" Laundry ", "Laundry"]},
            format="json",
        )
        self.assertEqual(valid.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.skills, ["Laundry"])

    def test_availability_crud_and_time_window_validation(self):
        url = reverse("availability-list")
        payload = {
            "employee": self.employee.pk,
            "date": "2026-10-20",
            "start_time": "08:00:00",
            "end_time": "16:00:00",
            "status": "AVAILABLE",
        }
        created = self.client.post(url, payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertEqual(self.client.get(url, {"date": "2026-10-20"}).data[0]["employee_code"], "EMP001")

        invalid = self.client.post(
            url, {**payload, "date": "2026-10-21", "start_time": "16:00:00", "end_time": "16:00:00"},
            format="json",
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

        deleted = self.client.delete(reverse("availability-detail", args=[created.data["id"]]))
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)

    def test_inactive_employee_cannot_record_availability(self):
        self.employee.employment_status = Employee.EmploymentStatus.INACTIVE
        self.employee.save()
        response = self.client.post(
            reverse("availability-list"),
            {"employee": self.employee.pk, "date": "2026-10-20", "status": "AVAILABLE"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_leave_request_defaults_to_pending_and_validates_dates(self):
        url = reverse("leave-request-list")
        response = self.client.post(
            url,
            {
                "employee": self.employee.pk,
                "start_date": "2026-10-24",
                "end_date": "2026-10-25",
                "reason": "Personal leave",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["status"], LeaveRequest.Status.PENDING)

        attempted_decision = self.client.patch(
            reverse("leave-request-detail", args=[response.data["id"]]),
            {"status": "APPROVED"},
            format="json",
        )
        self.assertEqual(attempted_decision.status_code, status.HTTP_400_BAD_REQUEST)

        invalid = self.client.post(
            url,
            {
                "employee": self.employee.pk,
                "start_date": "2026-10-26",
                "end_date": "2026-10-25",
                "reason": "Invalid range",
            },
            format="json",
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

        self.employee.employment_status = Employee.EmploymentStatus.INACTIVE
        self.employee.save()
        inactive = self.client.post(
            url,
            {
                "employee": self.employee.pk,
                "start_date": "2026-10-27",
                "end_date": "2026-10-27",
                "reason": "Inactive employee",
            },
            format="json",
        )
        self.assertEqual(inactive.status_code, status.HTTP_400_BAD_REQUEST)

    def test_eligibility_requires_active_employee_skills_and_matching_availability(self):
        EmployeeAvailability.objects.create(
            employee=self.employee,
            date=date(2026, 10, 20),
            start_time=time(8),
            end_time=time(16),
            status=EmployeeAvailability.Status.AVAILABLE,
        )
        response = self.client.get(
            reverse("employee-eligible"),
            {"date": "2026-10-20", "start_time": "09:00", "end_time": "15:00", "skills": "Laundry"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [self.employee.pk])

        no_skill_match = self.client.get(
            reverse("employee-eligible"),
            {"date": "2026-10-20", "skills": "First aid"},
        )
        self.assertEqual(no_skill_match.data, [])

        missing_date = self.client.get(reverse("employee-eligible"))
        self.assertEqual(missing_date.status_code, status.HTTP_400_BAD_REQUEST)
