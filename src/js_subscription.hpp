////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

#pragma once

#include "js_class.hpp"
#include "realm/sync/subscriptions.hpp"

namespace realm {
namespace js {

/**
 * @brief Glue class that provides an interface between \ref SetClass and \ref realm::object_store::Set
 *
 *  The Set class itself is an internal glue that delegates operations from \ref SetClass to
 *  \ref realm::object_store::Set.  It is used by Realm-JS's object management system, and it
 *  not meant to be instantiated directly.
 *
 * @tparam T The type of the elements that the Set will hold.  Inherited from \ref SetClass
 */
template<typename T>
class Subscription : public realm::sync::Subscription {
public:
    Subscription(const realm::sync::Subscription &subscription) : realm::sync::Subscription(subscription) {}
//    void derive_property_type(StringData const &object_name, Property &prop) const;

    std::vector<std::pair<Protected<typename T::Function>, NotificationToken>> m_notification_tokens;
};

template <typename T>
class SubscriptionClass : public ClassDefinition<T, realm::js::Subscription<T>> {
    using ContextType = typename T::Context;
    using FunctionType = typename T::Function;
    using ObjectType = typename T::Object;
    using ValueType = typename T::Value;
    using Context = js::Context<T>;
    using String = js::String<T>;
    using Value = js::Value<T>;
    using Object = js::Object<T>;
    using Function = js::Function<T>;
    using ReturnValue = js::ReturnValue<T>;
    using Arguments = js::Arguments<T>;

public:
    const std::string name = "Test";

    static void constructor(ContextType, ObjectType, Arguments&);
    static FunctionType create_constructor(ContextType);
    static ObjectType create_instance(ContextType, SharedApp);

    static void get_created_at(ContextType, ObjectType, ReturnValue &);
//    static void get_updated_at(ContextType, ObjectType, ReturnValue &);
//    static void get_name(ContextType, ObjectType, ReturnValue &);
//    static void get_object_class_name(ContextType, ObjectType, ReturnValue &);
//    static void get_query_string(ContextType, ObjectType, ReturnValue &);

    PropertyMap<T> const properties = {
        {"createdAt", {wrap<get_created_at>, nullptr}},
//        {"updatedAt", {wrap<get_updated_at>, nullptr}},
//        {"name", {wrap<get_name>, nullptr}},
//        {"objectClassName", {wrap<get_object_class_name>, nullptr}},
//        {"queryString", {wrap<get_query_string>, nullptr}},
    };
};

template <typename T>
inline typename T::Function TestClass<T>::create_constructor(ContextType ctx)
{
    FunctionType test_constructor = ObjectWrap<T, TestClass<T>>::create_constructor(ctx);

    // PropertyAttributes attributes = ReadOnly | DontEnum | DontDelete;
    // Object::set_property(ctx, sync_constructor, "User", ObjectWrap<T, UserClass<T>>::create_constructor(ctx),
    // attributes); Object::set_property(ctx, sync_constructor, "Session", ObjectWrap<T,
    // SessionClass<T>>::create_constructor(ctx), attributes);

    return test_constructor;
}

/**
 * @brief Implements JavaScript Set's `.size` property
 *
 *  Returns the number of elements in the SetClass.
 *  See [MDN's reference documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/size)
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SetClass itself
 * @param return_value \ref ReturnValue wrapping an integer that gives the number of elements in the set to return to the JS context
 */
template<typename T>
void SubscriptionClass<T>::get_created_at(ContextType ctx, ObjectType object, ReturnValue &return_value) {
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, object);
    return_value.set(Object::create_date(sub->created_at));
}

} // namespace js
} // namespace realm