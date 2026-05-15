from rest_framework import status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.registry.base import KernelModelViewSet

from .models import DemoItem
from .serializers import DemoItemSerializer


class DemoItemViewSet(KernelModelViewSet):
    resource_slug = "demo-items"
    queryset = DemoItem.objects.all()
    serializer_class = DemoItemSerializer
    search_fields = ("name", "sku")
    ordering_fields = ("name", "price", "created_at")
    ordering = ("-created_at",)
    filter_backends = (SearchFilter, OrderingFilter)
    resource_list_display = ("id", "name", "sku", "category", "price", "in_stock", "archived")

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        obj = self.get_object()
        obj.archived = True
        obj.save(update_fields=["archived"])
        return Response(DemoItemSerializer(obj, context={"request": request}).data, status=status.HTTP_200_OK)
