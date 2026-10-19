from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/complaints/', include('complaints.urls')),
    path('api/utilities/', include('utilities.urls')),
    path('api/traffic/', include('traffic.urls')),
    path('api/tax/', include('property_tax.urls')),
    path('api/dashboard/', include('dashboard.urls')),
]
