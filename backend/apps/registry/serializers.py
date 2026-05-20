from rest_framework import serializers

from apps.registry.models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = (
            "id",
            "resource_slug",
            "object_id",
            "verb",
            "message",
            "actor",
            "actor_username",
            "metadata",
            "created_at",
        )
        read_only_fields = fields

    def get_actor_username(self, obj):
        if obj.actor_id and obj.actor:
            return obj.actor.username
        return None
