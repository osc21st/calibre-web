/* This file is part of the Calibre-Web (https://github.com/janeczku/calibre-web)
 *    Copyright (C) 2020 OzzieIsaacs
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

/* exported TableActions, RestrictionActions, EbookActions, responseHandler */
/* global getPath, confirmDialog */

var selections = [];

$(function() {

    $("#books-table").on("check.bs.table check-all.bs.table uncheck.bs.table uncheck-all.bs.table",
        function (e, rowsAfter, rowsBefore) {
            var rows = rowsAfter;

            if (e.type === "uncheck-all") {
                rows = rowsBefore;
            }

            var ids = $.map(!$.isArray(rows) ? [rows] : rows, function (row) {
                return row.id;
            });

            var func = $.inArray(e.type, ["check", "check-all"]) > -1 ? "union" : "difference";
            selections = window._[func](selections, ids);
            if (selections.length >= 2) {
                $("#merge_books").removeClass("disabled");
                $("#merge_books").attr("aria-disabled", false);
            } else {
                $("#merge_books").addClass("disabled");
                $("#merge_books").attr("aria-disabled", true);
            }
            if (selections.length < 1) {
                $("#delete_selection").addClass("disabled");
                $("#delete_selection").attr("aria-disabled", true);
            } else {
                $("#delete_selection").removeClass("disabled");
                $("#delete_selection").attr("aria-disabled", false);
            }
        });
    $("#delete_selection").click(function() {
        $("#books-table").bootstrapTable("uncheckAll");
    });

    $("#merge_confirm").click(function() {
        $.ajax({
            method:"post",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            url: window.location.pathname + "/../../ajax/mergebooks",
            data: JSON.stringify({"Merge_books":selections}),
            success: function success() {
                $("#books-table").bootstrapTable("refresh");
                $("#books-table").bootstrapTable("uncheckAll");
            }
        });
    });

    $("#merge_books").click(function() {
        $.ajax({
            method:"post",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            url: window.location.pathname + "/../../ajax/simulatemerge",
            data: JSON.stringify({"Merge_books":selections}),
            success: function success(booTitles) {
                $.each(booTitles.from, function(i, item) {
                    $("<span>- " + item + "</span>").appendTo("#merge_from");
                });
                $("#merge_to").text("- " + booTitles.to);

            }
        });
    });

    var column = [];
    $("#books-table > thead > tr > th").each(function() {
        var element = {};
        if ($(this).attr("data-edit")) {
            element = {
                editable: {
                    mode: "inline",
                    emptytext: "<span class='glyphicon glyphicon-plus'></span>",
                    success: function (response, __) {
                        if (!response.success) return response.msg;
                        return {newValue: response.newValue};
                    },
                    params: function (params) {
                        params.checkA = $('#autoupdate_authorsort').prop('checked');
                        params.checkT = $('#autoupdate_titlesort').prop('checked');
                        return params
                    }
                }
            };
            var validateText = $(this).attr("data-edit-validate");
            if (validateText) {
                element.editable.validate = function (value) {
                    if ($.trim(value) === "") return validateText;
                };
            }
        }
        column.push(element);
    });

    $("#books-table").bootstrapTable({
        sidePagination: "server",
        queryParams: queryParams,
        pagination: true,
        paginationLoop: false,
        paginationDetailHAlign: " hidden",
        paginationHAlign: "left",
        idField: "id",
        uniqueId: "id",
        search: true,
        showColumns: true,
        searchAlign: "left",
        showSearchButton : true,
        searchOnEnterKey: true,
        checkboxHeader: false,
        maintainMetaData: true,
        responseHandler: responseHandler,
        columns: column,
        formatNoMatches: function () {
            return "";
        },
        // eslint-disable-next-line no-unused-vars
        onEditableSave: function (field, row, oldvalue, $el) {
            if ($.inArray(field, [ "title", "sort" ]) !== -1 && $('#autoupdate_titlesort').prop('checked')
                || $.inArray(field, [ "authors", "author_sort" ]) !== -1 && $('#autoupdate_authorsort').prop('checked')) {
                $.ajax({
                    method:"get",
                    dataType: "json",
                    url: window.location.pathname + "/../../ajax/sort_value/" + field + "/" + row.id,
                    success: function success(data) {
                        var key = Object.keys(data)[0];
                        $("#books-table").bootstrapTable("updateCellByUniqueId", {
                            id: row.id,
                            field: key,
                            value: data[key]
                        });
                    }
                });
            }
        },
        // eslint-disable-next-line no-unused-vars
        onColumnSwitch: function (field, checked) {
            var visible = $("#books-table").bootstrapTable("getVisibleColumns");
            var hidden  = $("#books-table").bootstrapTable("getHiddenColumns");
            var st = "";
            visible.forEach(function(item) {
                st += "\"" + item.field + "\":\"" + "true" + "\",";
            });
            hidden.forEach(function(item) {
                st += "\"" + item.field + "\":\"" + "false" + "\",";
            });
            st = st.slice(0, -1);
            $.ajax({
                method:"post",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                url: window.location.pathname + "/../../ajax/table_settings",
                data: "{" + st + "}",
            });
        },
    });


    $("#domain_allow_submit").click(function(event) {
        event.preventDefault();
        $("#domain_add_allow").ajaxForm();
        $(this).closest("form").submit();
        $.ajax ({
            method:"get",
            url: window.location.pathname + "/../../ajax/domainlist/1",
            async: true,
            timeout: 900,
            success:function(data) {
                $("#domain-allow-table").bootstrapTable("load", data);
            }
        });
    });

    $("#domain-allow-table").bootstrapTable({
        formatNoMatches: function () {
            return "";
        },
        striped: false
    });
    $("#domain_deny_submit").click(function(event) {
        event.preventDefault();
        $("#domain_add_deny").ajaxForm();
        $(this).closest("form").submit();
        $.ajax ({
            method:"get",
            url: window.location.pathname + "/../../ajax/domainlist/0",
            async: true,
            timeout: 900,
            success:function(data) {
                $("#domain-deny-table").bootstrapTable("load", data);
            }
        });
    });
    $("#domain-deny-table").bootstrapTable({
        formatNoMatches: function () {
            return "";
        },
        striped: false
    });

    function domainHandle(domainId) {
        $.ajax({
            method:"post",
            url: window.location.pathname + "/../../ajax/deletedomain",
            data: {"domainid":domainId}
        });
        $.ajax({
            method:"get",
            url: window.location.pathname + "/../../ajax/domainlist/1",
            async: true,
            timeout: 900,
            success:function(data) {
                $("#domain-allow-table").bootstrapTable("load", data);
            }
        });
        $.ajax({
            method:"get",
            url: window.location.pathname + "/../../ajax/domainlist/0",
            async: true,
            timeout: 900,
            success:function(data) {
                $("#domain-deny-table").bootstrapTable("load", data);
            }
        });
    }
    $("#domain-allow-table").on("click-cell.bs.table", function (field, value, row, $element) {
        if (value === 2) {
            confirmDialog("btndeletedomain", "GeneralDeleteModal", $element.id, domainHandle);
        }
    });
    $("#domain-deny-table").on("click-cell.bs.table", function (field, value, row, $element) {
        if (value === 2) {
            confirmDialog("btndeletedomain", "GeneralDeleteModal", $element.id, domainHandle);
        }
    });

    $("#restrictModal").on("hidden.bs.modal", function (e) {
        // Destroy table and remove hooks for buttons
        $("#restrict-elements-table").unbind();
        $("#restrict-elements-table").bootstrapTable("destroy");
        $("[id^=submit_]").unbind();
        $("#h1").addClass("hidden");
        $("#h2").addClass("hidden");
        $("#h3").addClass("hidden");
        $("#h4").addClass("hidden");
        $("#add_element").val("");
    });

    function startTable(target, userId) {
        var type = 0;
        switch(target) {
            case "get_column_values":
                type = 1;
                $("#h2").removeClass("hidden");
                break;
            case "get_tags":
                type = 0;
                $("#h1").removeClass("hidden");
                break;
            case "get_user_column_values":
                type = 3;
                $("#h4").removeClass("hidden");
                break;
            case "get_user_tags":
                type = 2;
                $("#h3").removeClass("hidden");
                break;
            case "denied_tags":
                type = 2;
                $("#h2").removeClass("hidden");
                $("#submit_allow").addClass("hidden");
                $("#submit_restrict").removeClass("hidden");
                break;
            case "allowed_tags":
                type = 2;
                $("#h2").removeClass("hidden");
                $("#submit_restrict").addClass("hidden");
                $("#submit_allow").removeClass("hidden");
                break;
            case "allowed_column_value":
                type = 3;
                $("#h2").removeClass("hidden");
                $("#submit_restrict").addClass("hidden");
                $("#submit_allow").removeClass("hidden");
                break;
            case "denied_column_value":
                type = 3;
                $("#h2").removeClass("hidden");
                $("#submit_allow").addClass("hidden");
                $("#submit_restrict").removeClass("hidden");
                break;
        }

        $("#restrict-elements-table").bootstrapTable({
            formatNoMatches: function () {
                return "";
            },
            url: getPath() + "/ajax/listrestriction/" + type + "/" + userId,
            rowStyle: function(row) {
                // console.log('Reihe :' + row + " Index :" + index);
                if (row.id.charAt(0) === "a") {
                    return {classes: "bg-primary"};
                } else {
                    return {classes: "bg-dark-danger"};
                }
            },
            onLoadSuccess: function () {
                $(".no-records-found").addClass("hidden");
                $(".fixed-table-loading").addClass("hidden");
            },
            onClickCell: function (field, value, row) {
                if (field === 3) {
                    $.ajax ({
                        type: "Post",
                        data: "id=" + row.id + "&type=" + row.type + "&Element=" + encodeURIComponent(row.Element),
                        url: getPath() + "/ajax/deleterestriction/" + type + "/" + userId,
                        async: true,
                        timeout: 900,
                        success:function() {
                            $.ajax({
                                method:"get",
                                url: getPath() + "/ajax/listrestriction/" + type + "/" + userId,
                                async: true,
                                timeout: 900,
                                success:function(data) {
                                    $("#restrict-elements-table").bootstrapTable("load", data);
                                }
                            });
                        }
                    });
                }
            },
            striped: false
        });
        $("#restrict-elements-table").removeClass("table-hover");
        $("#restrict-elements-table").on("editable-save.bs.table", function (e, field, row) {
            $.ajax({
                url: getPath() + "/ajax/editrestriction/" + type + "/" + userId,
                type: "Post",
                data: row
            });
        });
        $("[id^=submit_]").click(function() {
            $(this)[0].blur();
            $.ajax({
                url: getPath() + "/ajax/addrestriction/" + type + "/" + userId,
                type: "Post",
                data: $(this).closest("form").serialize() + "&" + $(this)[0].name + "=",
                success: function () {
                    $.ajax ({
                        method:"get",
                        url: getPath() + "/ajax/listrestriction/" + type + "/" + userId,
                        async: true,
                        timeout: 900,
                        success:function(data) {
                            $("#restrict-elements-table").bootstrapTable("load", data);
                        }
                    });
                }
            });
            return;
        });
    }

    $("#restrictModal").on("show.bs.modal", function(e) {
         var target = $(e.relatedTarget).attr('id');
         var dataId;
         $(e.relatedTarget).one('focus', function(e){$(this).blur();});
         //$(e.relatedTarget).blur();
         if ($(e.relatedTarget).hasClass("button_head")) {
             dataId = $('#user-table').bootstrapTable('getSelections').map(a => a.id);
         } else {
             dataId = $(e.relatedTarget).data("id");
         }
         startTable(target, dataId);
    });

    // User table handling
    var user_column = [];
    $("#user-table > thead > tr > th").each(function() {
        var element = {};
        if ($(this).attr("data-edit")) {
            element = {
                editable: {
                    mode: "inline",
                    emptytext: "<span class='glyphicon glyphicon-plus'></span>",
                    error: function(response) {
                        return response.responseText;
                    }
                }
            };
        }
        var validateText = $(this).attr("data-edit-validate");
        if (validateText) {
            element.editable.validate = function (value) {
                if ($.trim(value) === "") return validateText;
            };
        }
        user_column.push(element);
    });

    $("#user-table").bootstrapTable({
        sidePagination: "server",
        queryParams: queryParams,
        pagination: true,
        paginationLoop: false,
        paginationDetailHAlign: " hidden",
        paginationHAlign: "left",
        idField: "id",
        uniqueId: "id",
        search: true,
        showColumns: true,
        searchAlign: "left",
        showSearchButton : true,
        searchOnEnterKey: true,
        checkboxHeader: true,
        maintainMetaData: true,
        responseHandler: responseHandler,
        columns: user_column,
        formatNoMatches: function () {
            return "";
        },
        onPostBody () {
            // Remove all checkboxes from Headers for showing the texts in the column selector
            $('.columns [data-field]').each(function(){
                var elText = $(this).next().text();
                $(this).next().empty();
                var index = elText.lastIndexOf('\n', elText.length - 2);
                if ( index > -1) {
                    elText = elText.substr(index);
                }
                $(this).next().text(elText);
            });
        },
        onLoadSuccess: function () {
            var guest = $(".editable[data-name='name'][data-value='Guest']");
            guest.editable("disable");
            $(".editable[data-name='locale'][data-pk='"+guest.data("pk")+"']").editable("disable");
            $("input[data-name='admin_role'][data-pk='"+guest.data("pk")+"']").prop("disabled", true);
            $("input[data-name='passwd_role'][data-pk='"+guest.data("pk")+"']").prop("disabled", true);
            $("input[data-name='edit_shelf_role'][data-pk='"+guest.data("pk")+"']").prop("disabled", true);
            $("input[data-name='sidebar_read_and_unread'][data-pk='"+guest.data("pk")+"']").prop("disabled", true);
            $(".user-remove[data-pk='"+guest.data("pk")+"']").hide();
        },
        onSort: function(a, b) {
            console.log("huh");
        },
        onColumnSwitch: function () {
            var visible = $("#user-table").bootstrapTable("getVisibleColumns");
            var hidden  = $("#user-table").bootstrapTable("getHiddenColumns");
            var st = "";
            visible.forEach(function(item) {
                st += "\"" + item.name + "\":\"" + "true" + "\",";
            });
            hidden.forEach(function(item) {
                st += "\"" + item.name + "\":\"" + "false" + "\",";
            });
            st = st.slice(0, -1);
            $.ajax({
                method:"post",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                url: window.location.pathname + "/../../ajax/user_table_settings",
                data: "{" + st + "}",
            });
        },
    });

    $("#user_delete_selection").click(function() {
        $("#user-table").bootstrapTable("uncheckAll");
    });

    function user_handle (userId) {
        $.ajax({
            method:"post",
            url: window.location.pathname + "/../../ajax/deleteuser",
            data: {"userid":userId}
        });
        $.ajax({
            method:"get",
            url: window.location.pathname + "/../../ajax/listusers",
            async: true,
            timeout: 900,
            success:function(data) {
                $("#user-table").bootstrapTable("load", data);
            }
        });
    }

    $("#user-table").on("click-cell.bs.table", function (field, value, row, $element) {
        if (value === "denied_column_value") {
            ConfirmDialog("btndeluser", "GeneralDeleteModal", $element.id, user_handle);
        }
    });

    $("#user-table").on("check.bs.table check-all.bs.table uncheck.bs.table uncheck-all.bs.table",
    function (e, rowsAfter, rowsBefore) {
        var rows = rowsAfter;

        if (e.type === "uncheck-all") {
            rows = rowsBefore;
        }

        var ids = $.map(!$.isArray(rows) ? [rows] : rows, function (row) {
            return row.id;
        });
        var func = $.inArray(e.type, ["check", "check-all"]) > -1 ? "union" : "difference";
        selections = window._[func](selections, ids);
        if (selections.length < 1) {
            $("#user_delete_selection").addClass("disabled");
            $("#user_delete_selection").attr("aria-disabled", true);
            $(".check_head").attr("aria-disabled", true);
            $(".check_head").attr("disabled", true);
            $(".check_head").prop('checked', false);
            $(".button_head").attr("aria-disabled", true);
            $(".button_head").addClass("disabled");
            $(".header_select").attr("disabled", true);
        } else {
            $("#user_delete_selection").removeClass("disabled");
            $("#user_delete_selection").attr("aria-disabled", false);
            $(".check_head").attr("aria-disabled", false);
            $(".check_head").removeAttr("disabled");
            $(".button_head").attr("aria-disabled", false);
            $(".button_head").removeClass("disabled");
            $(".header_select").removeAttr("disabled");
        }
    });
});


/* Function for deleting domain restrictions */
function TableActions (value, row) {
    return [
        "<a class=\"danger remove\"  data-value=\"" + row.id
        + "\" title=\"Remove\">",
        "<i class=\"glyphicon glyphicon-trash\"></i>",
        "</a>"
    ].join("");
}

function editEntry(param)
{
    console.log(param);
}
/* Function for deleting domain restrictions */
function RestrictionActions (value, row) {
    return [
        "<div class=\"danger remove\" data-restriction-id=\"" + row.id + "\" title=\"Remove\">",
        "<i class=\"glyphicon glyphicon-trash\"></i>",
        "</div>"
    ].join("");
}

/* Function for deleting books */
function EbookActions (value, row) {
    return [
        "<div class=\"book-remove\" data-toggle=\"modal\" data-target=\"#deleteModal\" data-ajax=\"1\" data-delete-id=\"" + row.id + "\" title=\"Remove\">",
        "<i class=\"glyphicon glyphicon-trash\"></i>",
        "</div>"
    ].join("");
}

/* Function for deleting books */
function UserActions (value, row) {
    return [
        "<div class=\"user-remove\" data-value=\"delete\" onclick=\"deleteUser(this, '" + row.id + "')\" data-pk=\"" + row.id + "\" title=\"Remove\">",
        "<i class=\"glyphicon glyphicon-trash\"></i>",
        "</div>"
    ].join("");
}

/* Function for keeping checked rows */
function responseHandler(res) {
    $.each(res.rows, function (i, row) {
        row.state = $.inArray(row.id, selections) !== -1;
    });
    return res;
}

function singleUserFormatter(value, row) {
    return '<a class="btn btn-default" href="' + window.location.pathname + '/../../admin/user/' + row.id + '">' + this.buttontext + '</a>'
}

function checkboxFormatter(value, row, index){
    if(value & this.column)
        return '<input type="checkbox" class="chk" data-pk="' + row.id + '" data-name="' + this.field + '" checked onchange="checkboxChange(this, ' + row.id + ', \'' + this.name + '\', ' + this.column + ')">';
    else
        return '<input type="checkbox" class="chk" data-pk="' + row.id + '" data-name="' + this.field + '" onchange="checkboxChange(this, ' + row.id + ', \'' + this.name + '\', ' + this.column + ')">';
}

function checkboxChange(checkbox, userId, field, field_index) {
    $.ajax({
        method: "post",
        url: window.location.pathname + "/../../ajax/editlistusers/" + field,
        data: {"pk": userId, "field_index": field_index, "value": checkbox.checked},
        success: function (data) {
            if (!jQuery.isEmptyObject(data)) {
                $("#flash_success").remove();
                $("#flash_danger").remove();
                $( ".navbar" ).after( '<div class="row-fluid text-center" style="margin-top: -20px;">' +
                    '<div id="flash_'+data.type+'" class="alert alert-'+data.type+'">'+data.message+'</div>' +
                    '</div>');
            }
            $.ajax({
                method: "get",
                url: window.location.pathname + "/../../ajax/listusers",
                async: true,
                timeout: 900,
                success: function (data) {
                    $("#user-table").bootstrapTable("load", data);
                }
            });
        }
    });
}

function deactivateHeaderButtons(e) {
    $("#user_delete_selection").addClass("disabled");
    $("#user_delete_selection").attr("aria-disabled", true);
    $(".check_head").attr("aria-disabled", true);
    $(".check_head").attr("disabled", true);
    $(".check_head").prop('checked', false);
    $(".button_head").attr("aria-disabled", true);
    $(".button_head").addClass("disabled");
    $(".header_select").attr("disabled", true);
}

function selectHeader(element, field) {
    if (element.value !== "None") {
        confirmDialog(element.id, "GeneralChangeModal", 0, function () {
            var result = $('#user-table').bootstrapTable('getSelections').map(a => a.id);
            $.ajax({
                method: "post",
                url: window.location.pathname + "/../../ajax/editlistusers/" + field,
                data: {"pk": result, "value": element.value},
                success: function () {
                    $.ajax({
                        method: "get",
                        url: window.location.pathname + "/../../ajax/listusers",
                        async: true,
                        timeout: 900,
                        success: function (data) {
                            $("#user-table").bootstrapTable("load", data);
                            deactivateHeaderButtons();
                        }
                    });
                }
            });
        });
    }
}

function checkboxHeader(CheckboxState, field, field_index) {
    confirmDialog(field, "GeneralChangeModal", 0, function() {
        var result = $('#user-table').bootstrapTable('getSelections').map(a => a.id);
        $.ajax({
            method: "post",
            url: window.location.pathname + "/../../ajax/editlistusers/" + field,
            data: {"pk": result, "field_index": field_index, "value": CheckboxState},
            success: function () {
                $.ajax({
                    method: "get",
                    url: window.location.pathname + "/../../ajax/listusers",
                    async: true,
                    timeout: 900,
                    success: function (data) {
                        $("#user-table").bootstrapTable("load", data);
                        $("#user_delete_selection").addClass("disabled");
                        $("#user_delete_selection").attr("aria-disabled", true);
                        $(".check_head").attr("aria-disabled", true);
                        $(".check_head").attr("disabled", true);
                        $(".check_head").prop('checked', false);
                        $(".button_head").attr("aria-disabled", true);
                        $(".button_head").addClass("disabled");
                        $(".header_select").attr("disabled", true);
                    }
                });
            }
        });
    });
}

function deleteUser(a,b){
    confirmDialog(
    "btndeluser",
        "GeneralDeleteModal",
        0,
        function() {
            $.ajax({
                method:"post",
                url: window.location.pathname + "/../../ajax/deleteuser",
                data: {"userid":b},
                success:function(data) {
                    $("#flash_success").remove();
                    $("#flash_danger").remove();
                    if (!jQuery.isEmptyObject(data)) {
                        $( ".navbar" ).after( '<div class="row-fluid text-center" style="margin-top: -20px;">' +
                            '<div id="flash_'+data.type+'" class="alert alert-'+data.type+'">'+data.message+'</div>' +
                            '</div>');
                    }
                    $.ajax({
                        method: "get",
                        url: window.location.pathname + "/../../ajax/listusers",
                        async: true,
                        timeout: 900,
                        success: function (data) {
                            $("#user-table").bootstrapTable("load", data);
                        }
                    });
                }
            });
        }
    );
}

function queryParams(params)
{
    params.state = JSON.stringify(selections);
    return params;
}

function test(){
    console.log("hello");
}
