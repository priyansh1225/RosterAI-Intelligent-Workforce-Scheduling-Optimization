from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class OccupancyApiTests(APITestCase):
    def setUp(self):
        admin = get_user_model().objects.create_user(username="admin", password="test", is_staff=True)
        self.client.force_authenticate(user=admin)

    def test_occupancy_crud_and_room_count_validation(self):
        url = reverse("occupancy-list")
        payload = {
            "date": "2026-10-20", "total_rooms": 100, "occupied_rooms": 75,
            "expected_check_ins": 12, "expected_check_outs": 8,
        }
        created = self.client.post(url, payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertEqual(created.data["occupancy_rate"], 0.75)
        invalid = self.client.post(
            url, {**payload, "date": "2026-10-21", "occupied_rooms": 101}, format="json"
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.get(url).data[0]["date"], "2026-10-20")
