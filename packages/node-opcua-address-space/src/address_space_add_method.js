"use strict";
/**
 * @module opcua.address_space
 * @class AddressSpace
 */

const assert = require("node-opcua-assert").assert;
const _ = require("underscore");
const NodeClass = require("node-opcua-data-model").NodeClass;
const Argument = require("node-opcua-service-call").Argument;


const DataValue =  require("node-opcua-data-value").DataValue;
const Variant = require("node-opcua-variant").Variant;
const DataType = require("node-opcua-variant").DataType;
const VariantArrayType = require("node-opcua-variant").VariantArrayType;
const coerceQualifiedName = require("node-opcua-data-model").coerceQualifiedName;

const Namespace = require("./namespace").Namespace;
const BaseNode = require("./base_node").BaseNode;

exports.install = function (AddressSpace) {

    const isNonEmptyQualifiedName = Namespace.isNonEmptyQualifiedName;
    const _handle_hierarchy_parent = Namespace._handle_hierarchy_parent;


    Namespace.prototype._addMethod = function(options) {

        const self = this;

        const addressSpace = self.addressSpace;

        assert(isNonEmptyQualifiedName(options.browseName));

        const references = [];
        assert(isNonEmptyQualifiedName(options.browseName));

        _handle_hierarchy_parent(addressSpace, references, options);

        Namespace._process_modelling_rule(references, options.modellingRule);


        const method = self._createNode({
            nodeClass: NodeClass.Method,
            nodeId: options.nodeId,
            isAbstract: false,
            browseName: options.browseName,
            displayName: options.displayName,
            description: options.description || "",
            eventNotifier: +options.eventNotifier,
            references: references
        });
        assert(method.nodeId !== null);
        method.propagate_back_references();
        assert(!method.typeDefinition);

        return method;
    };

    /**
     * @method addMethod
     * @param parentObject {Object}
     * @param options {Object}
     * @param [options.nodeId=null] {NodeId} the object nodeid.
     * @param [options.browseName=""] {String} the object browse name.
     * @param [options.description=""] {String} the object description.
     * @param options.inputArguments  {Array<Argument>}
     * @param options.outputArguments {Array<Argument>}
     * @return {Object}
     */
    AddressSpace.prototype.addMethod = function(parentObject,options) {
        return  this._resolveRequestedNamespace(options).addMethod(parentObject,options);
    };
    Namespace.prototype.addMethod = function (parentObject, options) {
        const self = this;

        const addressSpace = self.addressSpace;

        assert(_.isObject(parentObject) && parentObject instanceof BaseNode,"expecting a valid parent object");

        options.nodeClass = NodeClass.Method;

        assert(options.hasOwnProperty("browseName"));
        assert(!options.hasOwnProperty("inputArguments") || _.isArray(options.inputArguments));
        assert(!options.hasOwnProperty("outputArguments") || _.isArray(options.outputArguments));

        options.componentOf = parentObject;

        const method = self._addMethod(options);

        const propertyTypeId = addressSpace._coerce_VariableTypeIds("PropertyType");

        const nodeId_ArgumentDataType = "Argument"; // makeNodeId(DataTypeIds.Argument);

        if (options.inputArguments) {
            const _inputArgs = new Variant({
                dataType: DataType.ExtensionObject,
                arrayType: VariantArrayType.Array,
                value: options.inputArguments.map(function (opt) {
                    return new Argument(opt);
                })
            });

            const inputArguments = self.addVariable({
                modellingRule: "Mandatory",
                propertyOf: method,
                typeDefinition: "PropertyType",
                browseName: {name:"InputArguments",namespaceIndex:0},
                description: "the definition of the input argument of method " + parentObject.browseName.toString() + "." + method.browseName.toString(),
                dataType: nodeId_ArgumentDataType,
                accessLevel: "CurrentRead",
                valueRank: 1,
                minimumSamplingInterval: -1,
                arrayDimensions: [_inputArgs.value.length],
                value: _inputArgs
            });
            inputArguments.setValueFromSource(_inputArgs);
            assert(inputArguments.typeDefinition.toString() === propertyTypeId.toString());
            //xx console.log("xxxx propertyTypeId = ", propertyTypeId, outputArguments.hasTypeDefinition);
            assert(_.isArray(inputArguments.arrayDimensions));

        }


        if (options.outputArguments) {
            const _ouputArgs = new Variant({
                dataType: DataType.ExtensionObject,
                arrayType: VariantArrayType.Array,
                value: options.outputArguments.map(function (opts) {
                    return new Argument(opts);
                })
            });

            const outputArguments = self.addVariable({
                modellingRule: "Mandatory",
                propertyOf: method,
                typeDefinition: "PropertyType",
                browseName: {name:"OutputArguments",namespaceIndex:0},
                description: "the definition of the output arguments of method " + parentObject.browseName.toString() + "." + method.browseName.toString(),
                dataType: nodeId_ArgumentDataType,
                accessLevel: "CurrentRead",
                valueRank: 1,
                minimumSamplingInterval: -1,
                arrayDimensions: [_ouputArgs.value.length],
                value: _ouputArgs
            });
            outputArguments.setValueFromSource(_ouputArgs);

            assert(outputArguments.typeDefinition.toString() === propertyTypeId.toString());
            assert(_.isArray(outputArguments.arrayDimensions));
        }

        // verifying post-conditions
        parentObject.install_extra_properties();

        return method;
    };

};
