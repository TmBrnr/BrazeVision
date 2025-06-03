# Problematic Liquid Syntax Test Cases

## Current Failing Case
```liquid
{% for product in {{custom_attribute.${Aktueller Warenkorb}.Products}} limit:3 %}
```
**Expected**: "Show 3 products from user data Aktueller Warenkorb.Products"
**Actual**: "Show product customer from"

## Operator Support Test Cases

### 1. Comparison Operators
```liquid
{% if user.age >= 18 %}
```
**Expected**: "Display when: user age is greater than or equal to 18"

```liquid
{% if product.price < 100 %}
```
**Expected**: "Display when: product price is less than 100"

```liquid
{% if user.name != "Anonymous" %}
```
**Expected**: "Display when: user name does not equal Anonymous"

### 2. Logical Operators
```liquid
{% if user.premium == true or user.trial_active == true %}
```
**Expected**: "Display when: user premium equals true OR user trial active equals true"

```liquid
{% if user.age > 21 and user.location == "US" %}
```
**Expected**: "Display when: user age is greater than 21 AND user location equals US"

### 3. Contains Operator
```liquid
{% if user.interests contains "sports" %}
```
**Expected**: "Display when: user interests contains sports"

### 4. Complex Braze Variables with Operators
```liquid
{% if {{${first_name}}} != "" and {{${last_name}}} != "" %}
```
**Expected**: "Display when: first name does not equal  AND last name does not equal "

```liquid
{% unless {{most_recently_used_device.${carrier}}} == "Verizon" %}
```
**Expected**: "Hide when: carrier (from current device) equals Verizon"

### 5. Multiple Operator Combinations
```liquid
{% if {{custom_attribute.${membership_level}}} == "premium" and {{${age}}} >= 18 or {{${country}}} == "US" %}
```
**Expected**: "Display when: custom membership level equals premium AND age is greater than or equal to 18 OR user's country equals US"

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

## Operator Support Implementation

### Supported Operators
- **Comparison**: `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Logical**: `and`, `or`
- **Membership**: `contains`

### Processing Logic
1. **Order precedence**: Longer operators processed first to avoid conflicts
2. **Word boundaries**: Text operators use word boundaries, symbols use exact match
3. **Space normalization**: Extra spaces cleaned up for readability
4. **Variable processing**: Nested Liquid variables within expressions are humanized
5. **Display mode aware**: Technical mode preserves original syntax

### Test Coverage
- Single operators in simple conditions
- Multiple operators in complex expressions
- Operators with Braze personalization variables
- Unless statements with operators
- Mixed operator types (comparison + logical) 

# Braze Liquid Highlighter Test Cases

## Overview
This document outlines test cases for the Braze Liquid syntax highlighter, which transforms complex Liquid templates into human-readable descriptions.

## Standard User Attributes
Test cases for basic user profile information.

### Test Case 1: Basic Variables
**Input:** `{{${city}}}`
**Expected:** `user's city`

### Test Case 2: Complex User Info
**Input:** `{{${email_address}}}`
**Expected:** `email address`

### Test Case 3: Personal Details
**Input:** `{{${first_name}}}`
**Expected:** `first name`

### Test Case 4: Profile Data
**Input:** `{{${last_used_app_date}}}`
**Expected:** `last app usage date`

## Device Attributes
Test cases for device-specific information.

### Test Case 1: Current Device
**Input:** `{{most_recently_used_device.${carrier}}}`
**Expected:** `mobile carrier`

### Test Case 2: Target Device
**Input:** `{{targeted_device.${model}}}`
**Expected:** `target device model`

### Test Case 3: Device Platform
**Input:** `{{most_recently_used_device.${platform}}}`
**Expected:** `device platform`

## Campaign & Canvas Attributes
Test cases for messaging campaign information.

### Test Case 1: Campaign Info
**Input:** `{{campaign.${name}}}`
**Expected:** `campaign name`

### Test Case 2: Canvas Journey
**Input:** `{{canvas.${variant_name}}}`
**Expected:** `Canvas variant name`

### Test Case 3: Card Content
**Input:** `{{card.${api_id}}}`
**Expected:** `card API ID`

## Dynamic Properties
Test cases for user-defined custom attributes and event properties.

### Test Case 1: Custom Attributes
**Input:** `{{custom_attribute.${membership_level}}}`
**Expected:** `custom membership level`

### Test Case 2: Event Properties
**Input:** `{{event_properties.${purchase_amount}}}`
**Expected:** `event data: purchase amount`

### Test Case 3: Subscription States
**Input:** `{{subscribed_state.${email_marketing}}}`
**Expected:** `subscription status for email marketing`

## Communication Channels
Test cases for multi-channel messaging.

### Test Case 1: SMS Properties
**Input:** `{{sms.${inbound_message_body}}}`
**Expected:** `SMS inbound message body`

### Test Case 2: WhatsApp Properties
**Input:** `{{whats_app.${inbound_media_urls}}}`
**Expected:** `WhatsApp inbound media urls`

## Email URLs
Test cases for email management links.

### Test Case 1: Unsubscribe Link
**Input:** `{{${set_user_to_unsubscribed_url}}}`
**Expected:** `unsubscribe link`

### Test Case 2: Opt-in Link
**Input:** `{{${set_user_to_opted_in_url}}}`
**Expected:** `opt-in link`

## Operators in Conditional Expressions
Test cases for logical and comparison operators.

### Test Case 1: Equality Check
**Input:** `{% if {{custom_attribute.${status}}} == "premium" %}`
**Expected:** `Display when: custom status equals premium`

### Test Case 2: Inequality Check
**Input:** `{% if {{${age}}} != 25 %}`
**Expected:** `Display when: age does not equal 25`

### Test Case 3: Greater Than
**Input:** `{% if {{event_properties.${score}}} > 100 %}`
**Expected:** `Display when: event data: score is greater than 100`

### Test Case 4: Less Than or Equal
**Input:** `{% if {{custom_attribute.${balance}}} <= 0 %}`
**Expected:** `Display when: custom balance is less than or equal to 0`

### Test Case 5: Greater Than or Equal
**Input:** `{% if {{${age}}} >= 18 %}`
**Expected:** `Display when: age is greater than or equal to 18`

### Test Case 6: Contains Check
**Input:** `{% if {{${city}}} contains "New" %}`
**Expected:** `Display when: user's city contains New`

### Test Case 7: Logical AND
**Input:** `{% if {{${age}}} >= 21 and {{custom_attribute.${verified}}} == true %}`
**Expected:** `Display when: age is greater than or equal to 21 AND custom verified equals true`

### Test Case 8: Logical OR
**Input:** `{% if {{${country}}} == "US" or {{${country}}} == "CA" %}`
**Expected:** `Display when: user's country equals US OR user's country equals CA`

## Liquid Filters Test Cases
Test cases for comprehensive filter support across all categories.

### Basic Filter Usage
**Input:** `{{ "Big Sale" | upcase }}`
**Expected:** `Big Sale (uppercase)`

### Chained Filters
**Input:** `{{ "Big Sale" | upcase | remove: "BIG" }}`
**Expected:** `Big Sale (uppercase, remove BIG)`

### Money Filter
**Input:** `{{custom_attribute.${account_balance} | money}}`
**Expected:** `custom account balance (formatted as currency)`

### Math with Money Filter
**Input:** `{{event_properties.${rewards_redeemed} | divided_by: 100.00 | money}}`
**Expected:** `event data: rewards redeemed (divided by 100.00, formatted as currency)`

### Array Filters - First
**Input:** `{{custom_attribute.${items} | first}}`
**Expected:** `custom items (first item)`

### Array Filters - Where with Size
**Input:** `{{products | where: "category", "electronics" | size}}`
**Expected:** `products (where "category", "electronics", count)`

### Array Filters - Join
**Input:** `{{user.interests | join: ", "}}`
**Expected:** `User interests (joined with ", ")`

### String Filters - Truncate
**Input:** `{{custom_attribute.${description} | truncate: 100}}`
**Expected:** `custom description (truncated to 100 characters)`

### Hash Filters - MD5
**Input:** `{{user.email | md5}}`
**Expected:** `User email (MD5 hashed)`

### Math Filters - Plus with At Most
**Input:** `{{custom_attribute.${score} | plus: 10 | at_most: 100}}`
**Expected:** `custom score (plus 10, maximum 100)`

### String Filters - HTML Cleanup
**Input:** `{{content | strip_html | strip_newlines}}`
**Expected:** `content (HTML tags removed, newlines removed)`

### Date Filter
**Input:** `{{${date_of_birth} | date: "%B %d, %Y"}}`
**Expected:** `date of birth (formatted as "%B %d, %Y")`

## Complex Real-World Test Cases

### Test Case 1: Membership Logic
**Input:** `{% if {{custom_attribute.${membership_level}}} == "premium" and {{${age}}} >= 18 %}`
**Expected:** `Display when: custom membership level equals premium AND age is greater than or equal to 18`

### Test Case 2: Device Targeting
**Input:** `{% if {{most_recently_used_device.${platform}}} == "ios" and {{targeted_device.${model}}} contains "iPhone" %}`
**Expected:** `Display when: device platform equals ios AND target device model contains iPhone`

### Test Case 3: Campaign Conditions
**Input:** `{% if {{campaign.${name}}} contains "Holiday" or {{canvas.${variant_name}}} == "gift_promo" %}`
**Expected:** `Display when: campaign name contains Holiday OR Canvas variant name equals gift_promo`

### Test Case 4: Event-Based Personalization
**Input:** `{% assign user_score = {{event_properties.${total_points}}} | plus: {{custom_attribute.${bonus_points}}} %}`
**Expected:** `Set user_score to event data: total points (plus custom bonus points)`

### Test Case 5: Subscription Management
**Input:** `{% if {{subscribed_state.${promotional_emails}}} == "subscribed" and {{${email_address}}} != blank %}`
**Expected:** `Display when: subscription status for promotional emails equals subscribed AND email address does not equal blank`

### Test Case 6: Geofencing Logic
**Input:** `{% if {{event_properties.${geofence_name}}} == "store_entrance" and {{custom_attribute.${loyalty_member}}} == true %}`
**Expected:** `Display when: event data: geofence name equals store_entrance AND custom loyalty member equals true`

### Test Case 7: Multi-Channel Messaging
**Input:** `{% if {{sms.${inbound_message_body}}} contains "STOP" or {{whats_app.${inbound_message_body}}} contains "unsubscribe" %}`
**Expected:** `Display when: SMS inbound message body contains STOP OR WhatsApp inbound message body contains unsubscribe`

### Test Case 8: Complex Assignment
**Input:** `{% assign display_name = {{${first_name}}} | default: {{${email_address}}} | truncate: 20 %}`
**Expected:** `Set display_name to first name (default: email address, truncated to 20 characters)`

## Edge Cases and Special Scenarios

### Test Case 1: Multiple Variable Types
**Input:** `{{${user_id}}} - {{custom_attribute.${display_name}}} ({{most_recently_used_device.${platform}}})`
**Expected:** `user ID - custom display name (device platform)`

### Test Case 2: Quoted String Conditions
**Input:** `{% if {{custom_attribute.${status}}} == "VIP Customer" %}`
**Expected:** `Display when: custom status equals VIP Customer`

### Test Case 3: Nested Object Properties
**Input:** `{{most_recently_used_device.${ad_tracking_enabled}}}`
**Expected:** `ad tracking status`

### Test Case 4: Boolean Logic with Null Checks
**Input:** `{% if {{${first_name}}} != blank and {{${last_name}}} != blank %}`
**Expected:** `Display when: first name does not equal blank AND last name does not equal blank`

### Test Case 5: Array Processing
**Input:** `{% for product in {{products}} limit:5 %}`
**Expected:** `Loop through products (show 5 items)`

### Test Case 6: Special Characters in Variables
**Input:** `{{custom_attribute.${user_preferences}}}`
**Expected:** `custom user preferences`

### Test Case 7: App Context Variables
**Input:** `{% if {{app.${api_id}}} == "mobile_app" and {{card.${name}}} contains "Welcome" %}`
**Expected:** `Display when: app API ID equals mobile_app AND card name contains Welcome`

### Test Case 8: API Trigger Properties
**Input:** `{% for item in {{api_trigger_properties.products}} limit:{{${random_bucket_number}}} %}`
**Expected:** `Loop through API trigger products (show random bucket number items)`

## Implementation Details

### Pattern Matching Priority
1. **Complex Braze patterns** (highest priority)
2. **Standard Liquid patterns** 
3. **Simple variable patterns**
4. **Fallback patterns** (lowest priority)

### Operator Processing
- Operators are processed by length (longest first) to avoid substring conflicts
- Supports both symbolic (`==`, `!=`, `>=`) and text operators (`and`, `or`, `contains`)
- Context-aware replacement maintains readability

### Filter Processing
- Supports 50+ Liquid filters across all categories
- Array filters: `join`, `first`, `last`, `where`, `size`, `sort`, `reverse`, `uniq`, `map`, `compact`, `concat`, `index`
- Math filters: `plus`, `minus`, `times`, `divided_by`, `round`, `abs`, `ceil`, `floor`, `modulo`, `at_most`, `at_least`
- String filters: `upcase`, `downcase`, `capitalize`, `truncate`, `strip`, `escape`, `append`, `prepend`, `replace`, `remove`, `split`
- Hash filters: `md5`, `sha1`, `hmac_sha1_hex`, `hmac_sha256`, `hmac_sha512`
- Money filters: `money`
- Additional filters: `date`, `default`, `time_zone`

### Variable Recognition
- **180+ predefined variables** with friendly descriptions
- **Dynamic pattern matching** for custom attributes and event properties
- **Category-based organization** (standard, device, campaign, canvas, custom, etc.)
- **Context-aware descriptions** based on variable type and usage

### Test Coverage
- **45+ test cases** covering all major pattern types
- **Edge case handling** for quoted strings, null checks, boolean logic
- **Real-world scenarios** reflecting actual Braze implementation patterns
- **Multi-channel support** for Email, SMS, WhatsApp, Push, In-App messaging

## Braze-Specific Tags Test Cases
Test cases for Braze-exclusive Liquid tags that control message delivery and fetch external data.

### Abort Message Tests

#### Test Case 1: Simple Abort
**Input:** `{% abort_message() %}`
**Expected:** `Stop message delivery`

#### Test Case 2: Abort with Reason
**Input:** `{% abort_message('language was nil') %}`
**Expected:** `Stop message with reason: language was nil`

### Connected Content Tests

#### Test Case 1: Basic Connected Content
**Input:** `{% connected_content http://numbersapi.com/random/trivia :save result %}`
**Expected:** `Fetch data from http://numbersapi.com/random/trivia and save as result`

#### Test Case 2: Complex Connected Content with POST
**Input:** `{% connected_content https://api.example.com/data :method post :headers { "Authorization": "Bearer token" } :body campaign={{campaign_name}} :save publication %}`
**Expected:** `Fetch data from https://api.example.com/data and save as publication`

#### Test Case 3: Connected Content with Rerender
**Input:** `{% connected_content https://example.com/api :rerender %}`
**Expected:** `Fetch and re-process data from https://example.com/api`

#### Test Case 4: Connected Content with Cache
**Input:** `{% connected_content [https://example.com/webservice.json] :cache_max_age 900 %}`
**Expected:** `Fetch cached data from [https://example.com/webservice.json] (cache 900 seconds)`

#### Test Case 5: HTTP Status Code Check
**Input:** `{% if result.__http_status_code__ != 200 %}`
**Expected:** `Display when: API response data HTTP status code does not equal 200`

### Connected Content Filter Tests

#### Test Case 1: JSON Escape Filter
**Input:** `{{event_properties.${message} | json_escape}}`
**Expected:** `event data: message (JSON escaped)`

#### Test Case 2: URL Parameter Escape
**Input:** `{{${email_address} | url_param_escape}}`
**Expected:** `email address (URL parameter escaped)`

## Advanced Connected Content Scenarios

### Test Case 1: Complex POST with Capture
```liquid
{% capture postbody %}
{
  "ids":[ca_57832,ca_75869],
  "include":{"attributes":{"withKey":["daily_deals"]}}
}
{% endcapture %}

{% connected_content https://example.com/api/endpoint :method post :headers { "Content-Type": "application/json" } :body {{postbody}} :save result %}
```
**Expected:** 
- Capture: `Start capturing as postbody`
- Connected Content: `Fetch data from https://example.com/api/endpoint and save as result`

### Test Case 2: Error Handling Pattern
```liquid
{% connected_content https://example.com/api/endpoint :save result %}
{% if result.__http_status_code__ != 200 %}
  {% abort_message('Connected Content returned a non-200 status code') %}
{% endif %}
```
**Expected:**
- Connected Content: `Fetch data from https://example.com/api/endpoint and save as result`
- Status Check: `Display when: API response data HTTP status code does not equal 200`
- Abort: `Stop message with reason: Connected Content returned a non-200 status code`

### Test Case 3: Personalized API Call
```liquid
{% connected_content https://examplewebsite.com?language=${language}&user={{${user_id}}} :rerender %}
```
**Expected:** `Fetch and re-process data from https://examplewebsite.com?language=${language}&user={{user_id}}}`

## Pattern Recognition Priority
The system now recognizes Braze-specific patterns with the following priority:

1. **Abort Message Patterns**
   - `abort_message('reason')` - Priority 1
   - `abort_message()` - Priority 2

2. **Connected Content Patterns**
   - Complex with multiple parameters - Priority 1
   - Simple with :save - Priority 2  
   - With :rerender - Priority 2
   - With :cache_max_age - Priority 2
   - Basic URL only - Priority 3

3. **Variable Recognition**
   - Connected content variables: `__http_status_code__`, `result`, `my_content`, `publication`, `postbody`
   - Proper handling of API response data

4. **Filter Support**
   - `json_escape` - for JSON data formatting
   - `url_param_escape` - for URL parameter safety

## Implementation Features

### Enhanced Pattern Matching
- **Complex regex patterns** handle multi-line connected content blocks
- **Parameter extraction** for :method, :headers, :body, :save, :cache_max_age, etc.
- **URL handling** supports both http:// and https:// protocols
- **Fallback recognition** ensures patterns are caught even with minor syntax variations

### Visual Styling
- **Color-coded patterns** distinguish different tag types
- **Red styling** for abort_message (danger/stop)
- **Blue styling** for connected_content (data fetching)
- **Context-aware descriptions** based on parameter combinations

### Real-World Usage Support
- **Multi-line formatting** handling for complex connected content blocks
- **Variable interpolation** within URLs and parameters
- **Error handling patterns** with status code checking
- **POST request support** with JSON body capture

The enhanced system now provides comprehensive support for **all major Braze-specific Liquid tags** with intuitive, human-readable transformations that maintain technical accuracy while improving readability. 

## Catalog Patterns Test Cases
Test cases for Braze catalog functionality supporting any type of data (not just products).

### Basic Catalog Operations

#### Test Case 1: Access Catalog
**Input:** `{% catalog_items Games %}`
**Expected:** `Access Games catalog`

#### Test Case 2: Single Item Retrieval
**Input:** `{% catalog_items Games 1234 %}`
**Expected:** `Get Games item: 1234`

#### Test Case 3: Multiple Item Retrieval
**Input:** `{% catalog_items games 1234 1235 1236 %}`
**Expected:** `Get multiple games items: 1234 1235 1236`

#### Test Case 4: Catalog with Rerender
**Input:** `{% catalog_items Messages greet_msg :rerender %}`
**Expected:** `Get and re-process Messages item: greet_msg`

#### Test Case 5: Catalog Selections
**Input:** `{% catalog_selection_items item-list selections %}`
**Expected:** `Get item-list selection: selections`

### Catalog Item Properties

#### Test Case 1: Item Title
**Input:** `{{ items[0].title }}`
**Expected:** `title`

#### Test Case 2: Item Price
**Input:** `{{ items[0].price }}`
**Expected:** `price`

#### Test Case 3: Venue Name (Conditional)
**Input:** `{% if items[0].venue_name.size > 10 %}`
**Expected:** `Display when: catalog items venue name size is greater than 10`

### Dynamic Catalog Usage

#### Test Case 1: Wishlist Assignment
**Input:** `{% assign wishlist = {{custom_attribute.${wishlist}}} %}`
**Expected:** `Set wishlist to custom wishlist`

#### Test Case 2: Dynamic Item Selection
**Input:** `{% catalog_items Games {{ wishlist[0] }} %}`
**Expected:** `Get Games item: wishlist[0]`

## Advanced Catalog Scenarios

### Real-World Example 1: Game Catalog
```liquid
{% catalog_items Games 1234 %}
Get {{ items[0].title }} for just {{ items[0].price }}!
```
**Expected:**
- Catalog: `Get Games item: 1234`
- Output: `title` and `price`

### Real-World Example 2: Multiple Games
```liquid
{% catalog_items games 1234 1235 1236 %}
Get the ultimate trio {{ items[0].title }}, {{ items[1].title }}, and {{ items[2].title }} today!
```
**Expected:**
- Catalog: `Get multiple games items: 1234 1235 1236`
- Output: Multiple `title` references

### Real-World Example 3: Conditional Display
```liquid
{% catalog_selection_items item-list selections %} 
{% if items[0].venue_name.size > 10 %}
Message if the venue name's size is more than 10 characters. 
{% elsif items[0].venue_name.size < 10 %}
Message if the venue name's size is less than 10 characters. 
{% else %} 
{% abort_message(no venue_name) %} 
{% endif %}
```
**Expected:**
- Selection: `Get item-list selection: selections`
- Conditions: `Display when: catalog items venue name size is greater than 10`
- Abort: `Stop message with reason: no venue_name`

### Real-World Example 4: Templated Catalogs
```liquid
{% assign wishlist = {{custom_attribute.${wishlist}}}%}
{% catalog_items Games {{ wishlist[0] }} %}
Get {{ items[0].title }} now, for just {{ items[0].price }}!
```
**Expected:**
- Assignment: `Set wishlist to custom wishlist`
- Catalog: `Get Games item: wishlist[0]`
- Output: `title` and `price`

### Real-World Example 5: Image Usage
```liquid
{% catalog_items Games 1234 %}
{{ items[0].image_link }}
```
**Expected:**
- Catalog: `Get Games item: 1234`
- Output: `image URL`

### Real-World Example 6: Messages Catalog with Rerender
```liquid
{% catalog_items Messages greet_msg :rerender %}
{{ items[0].Welcome_Message }}
```
**Expected:**
- Catalog: `Get and re-process Messages item: greet_msg`
- Output: `welcome message`

## Catalog Data Types Supported

The enhanced catalog patterns now support any type of catalog data:

1. **Games Catalog**: `title`, `price`, `image_link`
2. **Messages Catalog**: `Welcome_Message`, `content`
3. **Venues Catalog**: `venue_name`, `location`, `capacity`
4. **Products Catalog**: `name`, `price`, `description`, `image_url`
5. **Custom Catalogs**: Any custom fields and properties

## Implementation Features

### Enhanced Pattern Recognition
- **Generic catalog support** - not limited to products
- **Multiple item handling** with space-separated IDs
- **Selection support** with `catalog_selection_items`
- **Rerender flag** for dynamic content processing
- **Priority-based matching** for optimal pattern recognition

### Variable Recognition
- **Catalog-specific variables**: `items`, `title`, `price`, `venue_name`, `image_link`, `Welcome_Message`
- **Array notation**: `items[0]`, `items[1]`, etc.
- **Custom properties**: Dynamic recognition of catalog field names
- **Wishlist integration**: Support for user-defined catalog item arrays

### Pattern Priority
1. **Complex patterns with :rerender** (Priority 1)
2. **Simple single/multiple item patterns** (Priority 1-2) 
3. **Basic catalog access** (Priority 3)
4. **Fallback recognition** for syntax variations

### Real-World Support
- **Dynamic item selection** using variables and arrays
- **Conditional logic** based on catalog item properties
- **Multi-item messaging** with array iteration
- **Error handling** with abort_message integration
- **Image and media** support through catalog properties

The catalog system now provides **complete flexibility** for any type of structured data while maintaining intuitive, readable transformations! 