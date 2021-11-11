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
#include "js_subscription.hpp"
#include "realm/sync/subscriptions.hpp"

#include "../vendor/realm-core/test/test.hpp"
#include "../vendor/realm-core/test/util/test_path.hpp"
#include "realm/sync/noinst/client_history_impl.hpp"

namespace realm {
namespace js {

template <typename T>
class TestClass : public ClassDefinition<T, void*> {
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

    static void sub(ContextType, ObjectType, Arguments&, ReturnValue&);
    static void set(ContextType, ObjectType, Arguments&, ReturnValue&);

    MethodMap<T> const static_methods = {
        {"sub", wrap<sub>},
        {"set", wrap<set>},
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

template <typename T>
void TestClass<T>::sub(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    realm::sync::Subscription s;
    return_value.set(SubscriptionClass<T>::create_instance(ctx, s));
    // return_value.set

    // ObjectType arg = Value::validated_to_object(ctx, args[0], "object");

    // if (Object::template is_instance<ResultsClass<T>>(ctx, arg)) {
    //     auto results = get_internal<T, ResultsClass<T>>(ctx, arg);

    //     return_value.set(Value::from_string(ctx, results->get_query().get_description()));
    // }
    // else {
    //     return_value.set(Value::from_string(ctx, "Test!"));
    // }

    // auto app = *get_internal<T, AppClass<T>>(ctx, this_object);
}

struct SubscriptionStoreFixture {
    SubscriptionStoreFixture(const std::string path)
        : db(DB::create(sync::make_client_replication(), path))
    {
        auto write = db->start_write();
        auto a_table = write->get_or_add_table_with_primary_key("class_a", type_Int, "_id");
        a_table_key = a_table->get_key();
        if (foo_col = a_table->get_column_key("foo"); !foo_col) {
            foo_col = a_table->add_column(type_String, "foo");
        }
        if (bar_col = a_table->get_column_key("bar"); !bar_col) {
            bar_col = a_table->add_column(type_Int, "bar");
        }
        write->commit();
    }

    DBRef db;
    TableKey a_table_key;
    ColKey foo_col;
    ColKey bar_col;
};

template <typename T>
void TestClass<T>::set(ContextType ctx, ObjectType this_object, Arguments& args, ReturnValue& return_value)
{
    SubscriptionStoreFixture fixture("test.realm");
    realm::sync::SubscriptionStore store(fixture.db);

    auto out = store.get_latest().make_mutable_copy();
    auto read_tr = fixture.db->start_read();
    Query query_a(read_tr->get_table("class_a"));

    auto&& [it, inserted] = out.insert_or_assign("a sub", query_a);

    out.update_state(realm::sync::SubscriptionSet::State::Complete);
    out.commit();

    auto latest = store.get_latest();

    return_value.set(SubscriptionsClass<T>::create_instance(ctx, latest));
}

} // namespace js
} // namespace realm