import React, { useState } from 'react';
import { Layers, ZoomIn, CheckCircle2, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import Modal from '../../components/Modal';

export default function ArchitecturePage() {
  const [selectedDiagram, setSelectedDiagram] = useState(null);

  const diagrams = [
    {
      num: 1,
      title: 'Use Case Diagram',
      file: 'use_case_diagram.png',
      category: 'Behavioural',
      studentExplanation: 'Actor interactions across Citizen, Admin, Service Department, and Traffic Officer within the Smart City boundary.',
      implementationMapping: 'Mapped to user roles in accounts/models.py (UserRole) and role-specific views (Citizen, Admin, Department, Traffic dashboards).',
      codeArtifacts: ['accounts/permissions.py', 'accounts/views.py', 'Sidebar.jsx'],
    },
    {
      num: 2,
      title: 'Sequence Diagram',
      file: 'sequence_diagram.png',
      category: 'Behavioural',
      studentExplanation: 'Chronological timeline of a citizen lodging a complaint, server-side DRF validation, SQLite persistence, and automated confirmation notification.',
      implementationMapping: 'Executed when citizen submits form in SubmitComplaintPage.jsx -> POST /api/complaints/ -> ComplaintSerializer validation -> save() -> Notification creation.',
      codeArtifacts: ['complaints/views.py::ComplaintListCreateAPIView', 'complaints/serializers.py'],
    },
    {
      num: 3,
      title: 'Activity Diagram',
      file: 'activity_diagram.png',
      category: 'Behavioural',
      studentExplanation: '4 swimlanes (Citizen, System, Admin, Service Dept) covering grievance submission, validation decision diamond, delegation, repair, and closure.',
      implementationMapping: 'Workflow states verified in complaints/models.py and transition controllers in AssignedRequestsPage.jsx & ComplaintAdminPage.jsx.',
      codeArtifacts: ['complaints/models.py (ComplaintStatus)', 'AssignedRequestsPage.jsx'],
    },
    {
      num: 4,
      title: 'Collaboration / Communication Diagram',
      file: 'collaboration_diagram.png',
      category: 'Behavioural',
      studentExplanation: 'Numbered 2D message passing between Citizen, Complaint Controller, Assignment Manager, Database, and Notification Service.',
      implementationMapping: 'Directly mirrors the Django post_save signal and Notification model in accounts/models.py and complaints/views.py.',
      codeArtifacts: ['accounts/models.py::Notification', 'complaints/views.py'],
    },
    {
      num: 5,
      title: 'State Machine Diagram',
      file: 'state_machine_diagram.png',
      category: 'Behavioural',
      studentExplanation: 'Complaint lifecycle transitions: New -> Submitted -> Assigned -> In Progress -> Resolved -> Closed.',
      implementationMapping: 'Enforced via ComplaintStatus TextChoices and ComplaintStatusHistory audit trail logging in complaints/models.py.',
      codeArtifacts: ['complaints/models.py::ComplaintStatusHistory', 'Badge.jsx::StatusBadge'],
    },
    {
      num: 6,
      title: 'Class Diagram',
      file: 'class_diagram.png',
      category: 'Structural',
      studentExplanation: 'Core domain entities: Citizen, Admin, ServiceDepartment, TrafficOfficer, Complaint, ServiceRequest, WaterService, ElectricityService, PropertyTax, Payment, Notification.',
      implementationMapping: 'Implemented across accounts, complaints, utilities, traffic, and property_tax Django apps with ForeignKey associations.',
      codeArtifacts: ['accounts/models.py', 'complaints/models.py', 'utilities/models.py', 'property_tax/models.py'],
    },
    {
      num: 7,
      title: 'Component Diagram',
      file: 'component_diagram.png',
      category: 'Structural',
      studentExplanation: '3-tier modular component architecture: React Vite Frontend UI -> Django REST API Modules -> SQLite Database & Session Auth.',
      implementationMapping: 'Frontend src/ components communicate with DRF api/ endpoints over RESTful JSON with token authentication.',
      codeArtifacts: ['frontend/src/services/api.js', 'backend/config/urls.py', 'backend/config/settings.py'],
    },
    {
      num: 8,
      title: 'Deployment Diagram',
      file: 'deployment_diagram.png',
      category: 'Structural',
      studentExplanation: 'Runtime nodes: Client Browser (Chrome/Edge) on :5173 -> Application Server (Django WSGI/ASGI) on :8000 -> SQLite3 Database Engine.',
      implementationMapping: 'Local multi-tier execution via run_servers.ps1 hosting the Vite client and Django backend simultaneously.',
      codeArtifacts: ['vite.config.js (port 5173)', 'backend/manage.py runserver 8000'],
    },
    {
      num: 9,
      title: 'Object Diagram',
      file: 'object_diagram.png',
      category: 'Structural',
      studentExplanation: 'Runtime snapshot instances: citizen1, admin1, department1, traffic1, complaint1 (CMP-2026-A101), prop1 (PROP-9021-BL).',
      implementationMapping: 'Populated deterministically by the seed_data management command with verified relational integrity.',
      codeArtifacts: ['accounts/management/commands/seed_data.py'],
    },
    {
      num: 10,
      title: 'Package Diagram',
      file: 'package_diagram.png',
      category: 'Structural',
      studentExplanation: 'Modular subsystem packaging: accounts, complaints, utilities, traffic, property_tax, and dashboard.',
      implementationMapping: 'Directly structured as 6 discrete Django app packages in the backend/ directory with clean cross-package imports.',
      codeArtifacts: ['backend/accounts/', 'backend/complaints/', 'backend/utilities/', 'backend/property_tax/'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              Academic Lab Review-2 Showcase
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">OOAD & UML Architecture Mapping</h1>
            <p className="text-xs text-slate-500">
              Direct conceptual and code alignment between the 10 UML lab design diagrams and this working full-stack prototype
            </p>
          </div>
        </div>
      </div>

      {/* 10 UML Diagrams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {diagrams.map((d) => (
          <div
            key={d.num}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Diagram #{d.num}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {d.category}
                </span>
              </div>

              <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                {d.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {d.studentExplanation}
              </p>

              {/* Diagram Thumbnail Preview */}
              <div 
                onClick={() => setSelectedDiagram(d)}
                className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer relative overflow-hidden group/img hover:border-blue-300 transition-colors text-center"
              >
                <img
                  src={`/diagrams/${d.file}`}
                  alt={d.title}
                  className="max-h-48 mx-auto object-contain transition-transform group-hover/img:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML += `<div class="py-12 text-slate-400 text-xs font-mono">UML Diagram Preview: ${d.title}</div>`;
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/0 group-hover/img:bg-slate-900/10 flex items-center justify-center transition-colors">
                  <span className="opacity-0 group-hover/img:opacity-100 px-3 py-1 bg-white/90 text-slate-800 rounded-lg text-xs font-bold shadow-sm transition-opacity flex items-center">
                    <ZoomIn className="w-3.5 h-3.5 mr-1" />
                    Enlarge Diagram
                  </span>
                </div>
              </div>

              {/* Implementation Mapping Box */}
              <div className="mt-4 p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs">
                <p className="font-bold text-blue-900 flex items-center mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0" />
                  Prototype Implementation Mapping:
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  {d.implementationMapping}
                </p>
              </div>
            </div>

            {/* Footer with mapped files */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="font-semibold text-slate-500">Source Files:</span>
              {d.codeArtifacts.map((art) => (
                <span key={art} className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                  {art}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Enlarged Diagram Modal */}
      <Modal
        isOpen={!!selectedDiagram}
        onClose={() => setSelectedDiagram(null)}
        title={selectedDiagram ? `${selectedDiagram.title} (Diagram #${selectedDiagram.num})` : ''}
        maxWidth="max-w-4xl"
      >
        {selectedDiagram && (
          <div className="space-y-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 max-h-[70vh] overflow-auto text-center">
              <img
                src={`/diagrams/${selectedDiagram.file}`}
                alt={selectedDiagram.title}
                className="max-w-full mx-auto"
              />
            </div>
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <p className="font-bold text-slate-900">{selectedDiagram.studentExplanation}</p>
              <p className="text-slate-600">{selectedDiagram.implementationMapping}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
