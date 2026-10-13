from datetime import datetime, timezone

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from departments.models import Department
from employees.models import Employee
from occupancy.models import OccupancyRecord
from scheduling.models import Shift
from .models import StaffingRule


class DemandEstimationApiTests(APITestCase):
    def setUp(self):
        admin = get_user_model().objects.create_user(username="admin", password="test", is_staff=True)
        self.client.force_authenticate(user=admin)
        self.department = Department.objects.create(name="Housekeeping")
        self.employee = Employee.objects.create(
            employee_code="EMP-DEMAND-1", full_name="Nina Rao", email="nina@example.test",
            department=self.department,
        )
        OccupancyRecord.objects.create(
            date="2026-10-20", total_rooms=100, occupied_rooms=50,
            expected_check_ins=10, expected_check_outs=8,
        )
        self.rule = StaffingRule.objects.create(
            department=self.department,
            employees_per_occupied_room="0.02",
            employees_per_check_in="0.10",
            employees_per_check_out="0.05",
            minimum_staff=2,
        )

    def test_demand_uses_configured_rules_and_actual_roster_coverage(self):
        shift = Shift.objects.create(
            employee=self.employee, department=self.department,
            start_at=datetime(2026, 10, 20, 9, tzinfo=timezone.utc),
            end_at=datetime(2026, 10, 20, 17, tzinfo=timezone.utc),
        )
        response = self.client.get(reverse("demand-estimation"), {"date": "2026-10-20"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["source"], "deterministic_configured_ratios")
        department = response.data["departments"][0]
        self.assertEqual(department["required_staff"], 3)
        self.assertEqual(department["scheduled_staff"], 1)
        self.assertEqual(department["shortage"], 2)

    def test_missing_occupancy_has_clear_not_found_response(self):
        response = self.client.get(reverse("demand-estimation"), {"date": "2026-10-21"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_staffing_rule_rejects_negative_ratios(self):
        other_department = Department.objects.create(name="Front Desk")
        response = self.client.post(
            reverse("staffing-rule-list"),
            {"department": other_department.pk, "employees_per_occupied_room": "-1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        valid = self.client.post(
            reverse("staffing-rule-list"),
            {
                "department": other_department.pk,
                "employees_per_occupied_room": "0.01",
                "employees_per_check_in": "0.05",
                "employees_per_check_out": "0.05",
                "shift_start_time": "08:00:00",
                "shift_end_time": "16:00:00",
                "required_skills": ["Guest service"],
            },
            format="json",
        )
        self.assertEqual(valid.status_code, status.HTTP_201_CREATED, valid.data)
