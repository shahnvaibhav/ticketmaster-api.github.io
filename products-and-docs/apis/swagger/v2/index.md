---
layout: documentation
categories:
- documentation
- generated
- swagger
- v2
redirect_from:
- "/products-and-docs/apis/swagger/"
---

{% comment %}
  layout: documentation
  categories:
  - documentation                   // main category
  - swagger                         // name of API
  - v1                              // version of API
  data: swagger-pim-api             // file from swagger
{% endcomment %}

{%assign apiName = page.categories[2]%}
{%assign version = page.categories[3]%}

{% if version %}
<p class="version-button article {% if version == 'v2' %}active{% endif %}" style="margin-right: 0px;">
    <a href="/products-and-docs/apis/{{apiName}}/v2/">V 2.0</a>
</p>
<p class="version-button {% if version == 'v1' %}active{% endif %}">
    <a href="/products-and-docs/apis/{{apiName}}/v1/">V 1.0</a>
</p>
{% endif %}