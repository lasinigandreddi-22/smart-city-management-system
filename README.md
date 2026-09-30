# SMART CITY MANAGEMENT SYSTEM
## Simple B.Tech 3rd Year OOAD Lab Review-2 UML Design Diagrams

---

## 1. Project Overview

The **Smart City Management System** is an integrated civic services platform connecting citizens, municipal administration, service departments, and traffic enforcement.

All 10 UML diagrams in this project are designed at a **simple, beginner-friendly B.Tech 3rd-year student level**:
- Clean standard UML notation
- Simple PlantUML syntax with `!theme plain`
- Readable typography and generous spacing
- Free from unnecessary enterprise complexity, APIs, SQL, and technical protocols
- Perfectly sized for standard PowerPoint presentation slides

---

## 2. Main Actors

1. **Citizen**: Accesses public services, requests water connections, checks electricity info, submits & tracks complaints, views property tax, and receives notifications.
2. **Admin**: Manages citizens, services, utilities, complaints, traffic, property taxes, and generates reports.
3. **Service Department**: Processes assigned complaints, investigates issues, updates status, and resolves complaints.
4. **Traffic Officer**: Monitors traffic flow, updates traffic status, and reports incidents.

---

## 3. Main Modules

1. **Citizen Services**
2. **Water Management**
3. **Electricity Management**
4. **Complaint Management**
5. **Traffic Management**
6. **Property Tax**

---

## 4. Summary of Exactly 10 UML Diagrams

All diagrams are available in both `.puml` source and rendered `.png` / `.svg` formats inside the `images/` directory:

| # | Diagram | File Name | Category | Student Explanation |
|---|---|---|---|---|
| 1 | **Use Case Diagram** | `use_case_diagram.puml` | Behavioural | Stickman actors outside boundary with simple lines (`--`) to oval use cases. Balanced 2-column layout. |
| 2 | **Sequence Diagram** | `sequence_diagram.puml` | Behavioural | 10 chronological steps showing a citizen submitting a complaint, administrative delegation, resolution, and citizen notification. |
| 3 | **Activity Diagram** | `activity_diagram.puml` | Behavioural | 4 swimlanes (`Citizen`, `Smart City System`, `Admin`, `Service Department`) with a single `[Valid?]` decision diamond and direct validation loop. |
| 4 | **Communication Diagram** | `collaboration_diagram.puml` | Behavioural | Clear 2D object communication with simple numbered messages (1 to 8) showing how objects interact. |
| 5 | **State Machine Diagram** | `state_machine_diagram.puml` | Behavioural | Simple complaint lifecycle: `[*] -> New -> Submitted -> Assigned -> In Progress -> Resolved -> Closed -> [*]`, with `Submitted -> Rejected -> [*]`. |
| 6 | **Class Diagram** | `class_diagram.puml` | Structural | 13 essential classes with 2–4 attributes and 1–2 methods. Clean inheritance (`CityService <|-- WaterService`, `CityService <|-- ElectricityService`). |
| 7 | **Component Diagram** | `component_diagram.puml` | Structural | 3-tier modular components (UI -> Management Modules -> Database / Notification) with simple dependency arrows. |
| 8 | **Deployment Diagram** | `deployment_diagram.puml` | Structural | Simple nodes: Client Devices & Sensors -> Application Server (Spring Boot) -> Database Server (MySQL). |
| 9 | **Object Diagram** | `object_diagram.puml` | Structural | Concrete runtime snapshot with 5 realistic sample objects (`citizen1`, `admin1`, `department1`, `complaint1`, `notification1`). |
| 10 | **Package Diagram** | `package_diagram.puml` | Structural | 8 modular packages with simple, clean dependency arrows. |

---

## 5. How to Re-Render Diagrams Locally

To re-render all diagrams at any time using your local Java PlantUML compiler:
```powershell
python render_diagrams.py
```
This directly compiles all `.puml` files into high-resolution PNG and vector SVG files in the `images/` folder.
