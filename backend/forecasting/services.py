from decimal import Decimal, ROUND_CEILING

from .models import StaffingRule


def estimate_department_staffing(occupancy):
    requirements = []
    for rule in StaffingRule.objects.select_related("department").filter(
        is_active=True, department__is_active=True
    ):
        workload = (
            Decimal(occupancy.occupied_rooms) * rule.employees_per_occupied_room
            + Decimal(occupancy.expected_check_ins) * rule.employees_per_check_in
            + Decimal(occupancy.expected_check_outs) * rule.employees_per_check_out
        )
        requirements.append({
            "rule": rule,
            "required_staff": max(
                rule.minimum_staff,
                int(workload.quantize(Decimal("1"), rounding=ROUND_CEILING)),
            ),
        })
    return requirements
