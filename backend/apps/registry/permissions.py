from rest_framework.permissions import BasePermission, SAFE_METHODS


class KernelResourcePermission(BasePermission):
    """
    Phase-1 permission primitive: authenticated users only.
    Extend per-resource via viewset.permission_classes or registry entry later.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class KernelReadWritePermission(BasePermission):
    """
    Optional: authenticated reads; writes require staff (example extension point).
    Not wired by default — documents how to specialize.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return user.is_staff
