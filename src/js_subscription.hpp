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

template<typename T>
class Subscription : public realm::sync::Subscription {
  public:
    Subscription(const realm::sync::Subscription &s) : realm::sync::Subscription(s) {}
};

template <typename T>
class SubscriptionClass : public ClassDefinition<T, Subscription<T>> {
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
    const std::string name = "Subscription";

    static ObjectType create_instance(ContextType, realm::sync::Subscription);

    static void get_created_at(ContextType, ObjectType, ReturnValue&);
    static void get_updated_at(ContextType, ObjectType, ReturnValue&);
    static void get_name(ContextType, ObjectType, ReturnValue&);
    static void get_object_class_name(ContextType, ObjectType, ReturnValue&);
    static void get_query_string(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {
        {"createdAt", {wrap<get_created_at>, nullptr}},
        {"updatedAt", {wrap<get_updated_at>, nullptr}},
        {"name", {wrap<get_name>, nullptr}},
        {"objectClassName", {wrap<get_object_class_name>, nullptr}},
        {"queryString", {wrap<get_query_string>, nullptr}},
    };
};

template<typename T>
typename T::Object SubscriptionClass<T>::create_instance(ContextType ctx, realm::sync::Subscription subscription) {
    return create_object<T, SubscriptionClass<T>>(ctx, new Subscription<T>(std::move(subscription)));
}

/**
 * @brief Get the created date of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping an Date containing the created date
 */
template <typename T>
void SubscriptionClass<T>::get_created_at(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, object);
    return_value.set(Object::create_date(ctx, sub->created_at().get_nanoseconds()));
}

/**
 * @brief Get the updated date of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping an Date containing the updated date
 */
template <typename T>
void SubscriptionClass<T>::get_updated_at(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, object);
    return_value.set(Object::create_date(ctx, sub->updated_at().get_nanoseconds()));
}

/**
 * @brief Get the name of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping an string containing the name
 */
template <typename T>
void SubscriptionClass<T>::get_name(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, object);
    return_value.set(std::string{sub->name()});
}

/**
 * @brief Get the object class name of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping an string containing the object class name
 */
template <typename T>
void SubscriptionClass<T>::get_object_class_name(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, object);
    return_value.set(std::string{sub->object_class_name()});
}

/**
 * @brief Get the query string of the subscription
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping an string containing the query string
 */
template <typename T>
void SubscriptionClass<T>::get_query_string(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto sub = get_internal<T, SubscriptionClass<T>>(ctx, object);
    return_value.set(std::string{sub->query_string()});
}

/**
 * @brief Glue class that provides an interface between \ref SetClass and \ref realm::object_store::Set
 *
 *  The Set class itself is an internal glue that delegates operations from \ref SetClass to
 *  \ref realm::object_store::Set.  It is used by Realm-JS's object management system, and it
 *  not meant to be instantiated directly.
 *
 * @tparam T The type of the elements that the Set will hold.  Inherited from \ref SetClass
 */
// template <typename T>
// class Subscriptions : public realm::sync::SubscriptionSet {
// public:
//     Subscriptions(const realm::sync::SubscriptionSet& subscriptionSet)
//         : realm::sync::SubscriptionSet(subscriptionSet)
//     {
//     }
// };

template<typename T>
class Subscriptions : public realm::sync::SubscriptionSet {
  public:
    Subscriptions(const realm::sync::SubscriptionSet &s) : realm::sync::SubscriptionSet(s) {}
};

template <typename T>
class SubscriptionsClass : public ClassDefinition<T, Subscriptions<T>> {
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
    const std::string name = "Subscriptions";

    static ObjectType create_instance(ContextType, realm::sync::SubscriptionSet);

    static void get_empty(ContextType, ObjectType, ReturnValue&);
    // static void get_state(ContextType, ObjectType, ReturnValue&);
    // static void get_error(ContextType, ObjectType, ReturnValue&);

    PropertyMap<T> const properties = {
        {"empty", {wrap<get_empty>, nullptr}},
        // {"state", {wrap<get_state>, nullptr}},
        // {"error", {wrap<get_error>, nullptr}},
    };

    // static void get_subscriptions(ContextType, ObjectType, Arguments &, ReturnValue &);

    // MethodMap<T> const methods = {
    //     {"getSubscriptions", wrap<get_subscriptions>},
    // };
};

template<typename T>
typename T::Object SubscriptionsClass<T>::create_instance(ContextType ctx, realm::sync::SubscriptionSet subscriptionSet) {
    return create_object<T, SubscriptionsClass<T>>(ctx, new Subscriptions<T>(std::move(subscriptionSet)));
}

/**
 * @brief Get whether the subscriptions collection is empty or not
 *
 * @param ctx JS context
 * @param object \ref ObjectType wrapping the SubscriptionSet
 * @param return_value \ref ReturnValue wrapping an string containing the query string
 */
template <typename T>
void SubscriptionsClass<T>::get_empty(ContextType ctx, ObjectType object, ReturnValue& return_value)
{
    auto set = get_internal<T, SubscriptionsClass<T>>(ctx, object);
    return_value.set(set->size() == 0);
}


} // namespace js
} // namespace realm