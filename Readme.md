# RosterAI — Intelligent Workforce Scheduling & Optimization

## 📌 About the Project

RosterAI is an intelligent workforce scheduling system designed to solve inefficient and manually prepared staff rosters. Instead of assigning employees mainly based on availability or personal preferences, the system uses forecasted workload/demand to determine how many employees and which skills are required for each shift.

The system considers employee skills, availability, weekly offs, maximum working hours, rest requirements, shift timings, and workload to generate an optimized weekly roster.

## 🎯 Our Idea

The workflow is:

Workload / Demand Forecast  
↓  
Required Workforce Calculation  
↓  
Employee Availability + Skills  
↓  
Constraint & Cost Optimization  
↓  
Optimized Weekly Roster  
↓  
Admin Review → Publish

The system aims to maintain the right balance between:

- 👥 Workforce coverage
- 💰 Labour cost
- ⏰ Working hours
- 🧑‍💻 Employee availability
- 🛠️ Required skills
- 😴 Rest requirements
- ⚖️ Fair workload distribution

## ⭐ What Makes RosterAI Different?

Many solutions can generate a weekly roster. Our focus is what happens before and after the roster is generated.

### 1. 🔮 Demand-Driven Scheduling

Instead of asking the manager to manually decide how many employees are needed every day, RosterAI uses forecasted workload, occupancy, orders, or demand to calculate staffing requirements.

Example:

Expected Demand: HIGH

- Front Office → 4
- Housekeeping → 6
- Security → 2

The scheduling engine then finds the most suitable employees for those requirements.

### 2. 🔄 Dynamic Re-Scheduling

The roster is not treated as permanent.

If an employee suddenly becomes unavailable, demand increases, or a critical skill becomes unavailable, RosterAI identifies the affected shifts and re-optimizes the schedule instead of requiring the manager to rebuild the entire roster.

Employee unavailable  
↓  
Affected shift detected  
↓  
Find qualified replacements  
↓  
Check hours + rest + cost  
↓  
Updated roster

### 3. 🧪 What-If Simulation

Managers can test possible situations before actually changing the roster.

For example:

> What happens if 3 employees are absent on Saturday?

RosterAI can simulate the scenario and show:

- Current coverage
- Expected coverage after absence
- Skill gaps
- Additional working hours
- Additional labour cost

It can then recommend the best recovery strategy.

### 4. 💡 Explainable Scheduling

Instead of simply saying:

> Rahul assigned to Saturday.

RosterAI explains why:

- ✓ Required skill
- ✓ Available on Saturday
- ✓ Within weekly hour limit
- ✓ Required rest maintained
- ✓ Low overtime impact
- ✓ Helps maintain skill coverage

This makes the generated roster easier for administrators to understand and trust.

## 🏗️ Planned System

### 👨‍💼 Admin

- Manage employees
- Manage skills and departments
- Configure shifts
- Set working-hour and rest constraints
- Enter/import workload forecasts
- Generate weekly roster
- Review and publish schedules
- Run what-if simulations

### 👨‍💻 Employees

- View their roster
- Set availability
- Submit leave/unavailability
- Receive schedule updates

### ⚙️ Scheduling Engine

The optimization engine evaluates:

**Demand + Skills + Availability + Working Hours + Rest + Cost + Fairness**

and generates a suitable roster while respecting required constraints.

## 🚀 Our Core Difference

> RosterAI doesn't just create a roster. It helps organizations plan according to demand, understand the impact of unexpected changes, recover from staffing problems, and make scheduling decisions through an optimized and explainable system.

### In Short

**Demand-driven planning + Automated optimization + Dynamic re-scheduling + What-if simulation + Explainable decisions**