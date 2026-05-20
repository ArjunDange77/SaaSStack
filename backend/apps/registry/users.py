from django.contrib.auth import get_user_model
from rest_framework import mixins, serializers, viewsets
from rest_framework.permissions import IsAuthenticated

User = get_user_model()


class KernelUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username")
        read_only_fields = fields


class KernelUserViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only user list for relation label resolution in the UI."""

    resource_slug = "kernel-users"
    queryset = User.objects.all().order_by("username")
    serializer_class = KernelUserSerializer
    permission_classes = [IsAuthenticated]
