"""Tenant-prefixed file storage for multi-tenant SaaS."""

import contextvars

from django.core.files.storage import FileSystemStorage
from storages.backends.azure_storage import AzureStorage

_tenant_slug: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "storage_tenant_slug", default=None
)


def set_storage_tenant_slug(slug: str | None):
    _tenant_slug.set(slug)


def get_storage_tenant_slug() -> str | None:
    return _tenant_slug.get()


def _prefix_name(name: str) -> str:
    slug = get_storage_tenant_slug()
    if not slug:
        slug = "unknown"
    name = name.lstrip("/")
    if name.startswith(f"{slug}/"):
        return name
    return f"{slug}/{name}"


class TenantPrefixedFileSystemStorage(FileSystemStorage):
    """Local dev storage with {tenant_slug}/ prefix."""

    def _save(self, name, content):
        return super()._save(_prefix_name(name), content)

    def exists(self, name):
        return super().exists(_prefix_name(name))

    def delete(self, name):
        return super().delete(_prefix_name(name))

    def url(self, name):
        return super().url(_prefix_name(name))

    def open(self, name, mode="rb"):
        return super().open(_prefix_name(name), mode)

    def size(self, name):
        return super().size(_prefix_name(name))


class TenantPrefixedAzureStorage(AzureStorage):
    """Azure Blob storage with {tenant_slug}/ object key prefix."""

    def _save(self, name, content):
        return super()._save(_prefix_name(name), content)

    def exists(self, name):
        return super().exists(_prefix_name(name))

    def delete(self, name):
        return super().delete(_prefix_name(name))

    def url(self, name):
        return super().url(_prefix_name(name))

    def open(self, name, mode="rb"):
        return super().open(_prefix_name(name), mode)

    def size(self, name):
        return super().size(_prefix_name(name))
