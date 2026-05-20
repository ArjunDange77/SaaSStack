from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.registry.permissions import get_membership, get_resident_id_for_user

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = UserSerializer(request.user).data
        membership = get_membership(request)
        data["role"] = membership.role if membership else None
        data["resident_id"] = get_resident_id_for_user(request)
        from apps.products.school_bus.permissions import get_driver_for_user, get_parent_for_user

        driver = get_driver_for_user(request)
        parent = get_parent_for_user(request)
        data["driver_id"] = driver.id if driver else None
        data["parent_id"] = parent.id if parent else None
        return Response(data)
