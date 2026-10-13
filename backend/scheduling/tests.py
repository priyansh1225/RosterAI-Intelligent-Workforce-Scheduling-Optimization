from datetime import date, time

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from departments.models import Department
from employees.models import Employee, EmployeeAvailability
from forecasting.models import StaffingRule
from occupancy.models import OccupancyRecord
from .models import Roster, Shift


class ShiftApiTests(APITestCase):
    def setUp(self):
        admin = get_user_model().objects.create_user(username="admin", password="test", is_staff=True)
        self.client.force_authenticate(user=admin)
        self.department = Department.objects.create(name="Housekeeping")
        self.employee = Employee.objects.create(
            employee_code="EMP-SHIFT-1", full_name="Mira Patel", email="mira@example.test",
            department=self.department, skills=["Room cleaning"], max_weekly_hours=40,
        )
        EmployeeAvailability.objects.create(
            employee=self.employee, date=date(2026, 10, 19), start_time=time(8), end_time=time(20),
            status=EmployeeAvailability.Status.AVAILABLE,
        )

    def payload(self, **overrides):
        data = {
            "employee": self.employee.pk,
            "department": self.department.pk,
            "start_at": "2026-10-19T09:00:00Z",
            "end_at": "2026-10-19T17:00:00Z",
            "required_skills": ["Room cleaning"],
        }
        data.update(overrides)
        return data

    def test_create_draft_shift_and_daily_weekly_roster_endpoints(self):
        created = self.client.post(reverse("shift-list"), self.payload(), format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertEqual(created.data["status"], Shift.Status.DRAFT)
        daily = self.client.get(reverse("shift-daily"), {"date": "2026-10-19"})
        weekly = self.client.get(reverse("shift-weekly"), {"date": "2026-10-21"})
        self.assertEqual(len(daily.data), 1)
        self.assertEqual(len(weekly.data), 1)

    def test_rejects_overlap_skill_mismatch_and_unavailable_employee(self):
        created = self.client.post(reverse("shift-list"), self.payload(), format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        overlap = self.client.post(
            reverse("shift-list"),
            self.payload(start_at="2026-10-19T16:00:00Z", end_at="2026-10-19T19:00:00Z"),
            format="json",
        )
        self.assertEqual(overlap.status_code, status.HTTP_400_BAD_REQUEST)

        skill = self.client.post(
            reverse("shift-list"),
            self.payload(start_at="2026-10-19T18:00:00Z", end_at="2026-10-19T19:00:00Z", required_skills=["First aid"]),
            format="json",
        )
        self.assertEqual(skill.status_code, status.HTTP_400_BAD_REQUEST)

    def test_minimum_rest_and_weekly_hours_are_enforced(self):
        self.employee.max_weekly_hours = 8
        self.employee.save()
        first = self.client.post(reverse("shift-list"), self.payload(), format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        EmployeeAvailability.objects.create(
            employee=self.employee, date=date(2026, 10, 20), start_time=time(0), end_time=time(23),
            status=EmployeeAvailability.Status.AVAILABLE,
        )

        too_soon = self.client.post(
            reverse("shift-list"),
            self.payload(start_at="2026-10-20T01:00:00Z", end_at="2026-10-20T02:00:00Z"),
            format="json",
        )
        self.assertEqual(too_soon.status_code, status.HTTP_400_BAD_REQUEST)

        over_limit = self.client.post(
            reverse("shift-list"),
            self.payload(start_at="2026-10-20T08:00:00Z", end_at="2026-10-20T12:00:00Z"),
            format="json",
        )
        self.assertEqual(over_limit.status_code, status.HTTP_400_BAD_REQUEST)

    def test_overnight_shift_is_supported_with_overnight_availability(self):
        EmployeeAvailability.objects.filter(employee=self.employee).delete()
        EmployeeAvailability.objects.create(
            employee=self.employee, date=date(2026, 10, 19), start_time=time(20), end_time=time(8),
            status=EmployeeAvailability.Status.AVAILABLE,
        )
        response = self.client.post(
            reverse("shift-list"),
            self.payload(start_at="2026-10-19T22:00:00Z", end_at="2026-10-20T06:00:00Z"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(len(self.client.get(reverse("shift-daily"), {"date": "2026-10-20"}).data), 1)

    def test_inactive_employee_and_published_shift_creation_are_rejected(self):
        self.employee.employment_status = Employee.EmploymentStatus.INACTIVE
        self.employee.save()
        inactive = self.client.post(reverse("shift-list"), self.payload(), format="json")
        self.assertEqual(inactive.status_code, status.HTTP_400_BAD_REQUEST)
        self.employee.employment_status = Employee.EmploymentStatus.ACTIVE
        self.employee.save()
        published = self.client.post(
            reverse("shift-list"), self.payload(status="PUBLISHED"), format="json"
        )
        self.assertEqual(published.status_code, status.HTTP_400_BAD_REQUEST)


class RosterWorkflowTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(username="manager", password="test", is_staff=True)
        self.client.force_authenticate(user=self.admin)
        self.department = Department.objects.create(name="Housekeeping")
        self.employee = Employee.objects.create(
            employee_code="EMP-ROSTER-1", full_name="Leela Das", email="leela@example.test",
            department=self.department, skills=["Room cleaning"],
        )
        OccupancyRecord.objects.create(
            date="2026-10-30", total_rooms=80, occupied_rooms=40,
        )
        StaffingRule.objects.create(
            department=self.department, minimum_staff=2, required_skills=["Room cleaning"],
        )
        EmployeeAvailability.objects.create(
            employee=self.employee, date=date(2026, 10, 30), status=EmployeeAvailability.Status.AVAILABLE,
        )

    def test_roster_generation_shortage_review_and_publication(self):
        url = reverse("roster-generate")
        generated = self.client.post(url, {"date": "2026-10-30"}, format="json")
        self.assertEqual(generated.status_code, status.HTTP_201_CREATED, generated.data)
        self.assertEqual(generated.data["status"], Roster.Status.DRAFT)
        self.assertEqual(len(generated.data["shifts"]), 1)
        self.assertEqual(generated.data["shortage_summary"][0]["unfilled"], 1)

        roster_id = generated.data["id"]
        denied_approval = self.client.post(reverse("roster-approve", args=[roster_id]), {}, format="json")
        self.assertEqual(denied_approval.status_code, status.HTTP_400_BAD_REQUEST)
        approved = self.client.post(
            reverse("roster-approve", args=[roster_id]),
            {"approval_note": "Manager accepts the remaining coverage gap."},
            format="json",
        )
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.assertEqual(approved.data["status"], Roster.Status.APPROVED)
        published = self.client.post(reverse("roster-publish", args=[roster_id]), {}, format="json")
        self.assertEqual(published.status_code, status.HTTP_200_OK)
        self.assertEqual(published.data["status"], Roster.Status.PUBLISHED)
        self.assertEqual(published.data["shifts"][0]["status"], Shift.Status.PUBLISHED)

    def test_roster_generation_requires_occupancy(self):
        response = self.client.post(
            reverse("roster-generate"), {"date": "2026-10-31"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_roster_endpoints_require_staff_user(self):
        employee_user = get_user_model().objects.create_user(username="employee", password="test")
        self.client.force_authenticate(user=employee_user)
        response = self.client.get(reverse("roster-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
