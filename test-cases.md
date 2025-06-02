# Problematic Liquid Syntax Test Cases

## Current Failing Case
```liquid
{% for product in {{custom_attribute.${Aktueller Warenkorb}.Products}} limit:3 %}
```
**Expected**: "Show 3 products from user data Aktueller Warenkorb.Products"
**Actual**: "Show product customer from"

## Other Likely Problematic Cases

### 1. Complex Nested Variables
```liquid
{% for item in {{catalog_items.${content_blocks.${dynamic_section}.id}.products}} limit:5 %}
```

### 2. Multiple Embedded Liquid
```liquid
{% if {{user.${custom_attribute.${region}}.preferences}} and {{cart.total}} > 100 %}
```

### 3. Nested Filters
```liquid
{% for product in {{recommended_products | limit: {{custom_attribute.${max_products}}} }} %}
```

### 4. German/International Variable Names
```liquid
{{custom_attribute.${Aktuelle Bestellung}.Gesamtpreis}}
```

### 5. Complex Object Paths
```liquid
{{content_blocks.${recommendations.${user_segment}.block_id} | default: 'fallback'}}
```

### 6. Multiple ${} in Single Expression
```liquid
{% assign total = {{custom_attribute.${cart}.${currency}.total}} %}
```

### 7. Spaces in Variable Names
```liquid
{{custom_attribute.${"User Preferences"}.theme}}
```

### 8. Special Characters
```liquid
{{custom_attribute.${"@user-id"}.profile}}
```

### 9. Deeply Nested Collections
```liquid
{% for category in {{catalog_items.categories.${custom_attribute.${user_type}}.subcategories}} %}
```

### 10. Mixed Syntax Types
```liquid
{% include '{{custom_attribute.${template_name}.template}}' with product: {{featured_product}} %}
```

### 11. Dynamic Limits
```liquid
{% for product in products limit:{{custom_attribute.${display_count}}} %}
```

### 12. Complex Conditions
```liquid
{% if {{custom_attribute.${membership_level}}} == 'premium' and {{cart.item_count}} > {{custom_attribute.${min_items}}} %}
```

## Root Causes of Issues

### Pattern Matching Problems
1. **Greedy vs Non-greedy matching**: Current regex stops too early
2. **Nested braces handling**: `{{}}` inside `{%%}` breaks the parser
3. **Space handling**: Variable names with spaces aren't captured
4. **Special characters**: Non-alphanumeric characters break patterns

### Variable Transformation Issues
1. **Path complexity**: Nested dot notation with ${} patterns
2. **International characters**: German umlauts and special characters
3. **Dynamic variable names**: Variables that are themselves liquid expressions
4. **Whitespace sensitivity**: Extra spaces breaking the logic

### Template Replacement Problems
1. **Placeholder mapping**: Groups don't map to correct placeholders
2. **Multiple captures**: Complex patterns need multiple variable substitutions
3. **Conditional logic**: Some placeholders should be optional
4. **Order dependency**: Processing order affects final result

### Configuration Limitations
1. **Static patterns**: Current regex patterns are too rigid
2. **Missing edge cases**: Config doesn't handle complex real-world cases
3. **Language support**: No support for non-English variable names
4. **Dynamic configuration**: Can't handle context-dependent transformations 