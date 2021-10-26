import { all, put, select, takeLeading } from "redux-saga/effects";
import { ReduxAction, ReduxActionTypes } from "constants/ReduxActionConstants";
import history from "../utils/history";
import { BUILDER_PAGE_URL } from "../constants/routes";
import {
  getCurrentApplicationId,
  getCurrentPageId,
} from "../selectors/editorSelectors";
import { ActionData } from "../reducers/entityReducers/actionsReducer";
import { getCanvasWidgets } from "../selectors/entitiesSelector";
import {
  setWidgetDynamicProperty,
  updateWidgetPropertyRequest,
} from "../actions/controlActions";
import { Toaster } from "../components/ads/Toast";
import { Variant } from "../components/ads/common";
import AnalyticsUtil from "../utils/AnalyticsUtil";

import {
  createMessage,
  SNIPING_NOT_SUPPORTED,
  SNIPING_SELECT_WIDGET_AGAIN,
} from "constants/messages";

import log from "loglevel";
import { SnipedWidgetPropertyDataType } from "../widgets/BaseWidget";
import WidgetFactory from "utils/WidgetFactory";
import { SnipablePropertyValueType } from "../widgets/BaseWidget";

const WidgetTypes = WidgetFactory.widgetTypes;

export const getPropertyValueFromType = (
  propertyType: SnipablePropertyValueType,
  widgetType: string,
  currentAction: any,
  selectedWidget: any,
) => {
  // This is special condition for widgets
  if (propertyType === SnipablePropertyValueType.NONE) return null;
  else if (
    propertyType === SnipablePropertyValueType.CUSTOM &&
    widgetType === WidgetTypes.CHART_WIDGET
  ) {
    const primarySequenceKey = Object.keys(selectedWidget.chartData)[0];
    const suggestedQuery = currentAction?.data?.suggestedWidgets?.find(
      (eachWidget: any) => eachWidget.type === widgetType,
    )?.bindingQuery;
    return {
      [primarySequenceKey]: {
        data: `{{${currentAction.config.name}.${suggestedQuery}}}`,
        seriesName: "Demo",
      },
    };
  } else {
    return `{{${currentAction.config.name}.${
      propertyType === SnipablePropertyValueType.DATA ? "data" : "run()"
    }}}`;
  }
};

export function* bindDataToWidgetSaga(
  action: ReduxAction<SnipedWidgetPropertyDataType & { widgetId: string }>,
) {
  try {
    const {
      errorMessage,
      isSnipable,
      shouldSetPropertyInputToJsMode,
      snipableProperty,
      snipablePropertyValueType,
      widgetId,
      widgetType,
    } = action.payload;
    const applicationId = yield select(getCurrentApplicationId);
    const pageId = yield select(getCurrentPageId);
    const currentURL = new URL(window.location.href);
    const searchParams = currentURL.searchParams;
    const queryId = searchParams.get("bindTo");
    const currentAction = yield select((state) =>
      state.entities.actions.find(
        (action: ActionData) => action.config.id === queryId,
      ),
    );
    const selectedWidget = (yield select(getCanvasWidgets))[widgetId];
    const snipablePropertyValue = getPropertyValueFromType(
      snipablePropertyValueType,
      widgetType,
      currentAction,
      selectedWidget,
    );

    AnalyticsUtil.logEvent("WIDGET_SELECTED_VIA_SNIPING_MODE", {
      widgetType,
      isSnipable,
      widgetId,
      actionName: currentAction.config.name,
      apiId: queryId,
      snipableProperty,
      snipablePropertyValue,
    });

    if (!selectedWidget || !selectedWidget.type) {
      Toaster.show({
        text: createMessage(SNIPING_SELECT_WIDGET_AGAIN),
        variant: Variant.warning,
      });
      return;
    }

    if (!isSnipable) {
      queryId &&
        Toaster.show({
          text: createMessage(SNIPING_NOT_SUPPORTED),
          variant: Variant.warning,
        });
      return;
    }

    if (queryId && isSnipable && snipableProperty && snipablePropertyValue) {
      // set the property path to dynamic, i.e. enable JS mode
      if (shouldSetPropertyInputToJsMode)
        yield put(setWidgetDynamicProperty(widgetId, snipableProperty, true));
      yield put(
        updateWidgetPropertyRequest(
          widgetId,
          snipableProperty,
          snipablePropertyValue,
        ),
      );
      yield put({
        type: ReduxActionTypes.SHOW_PROPERTY_PANE,
        payload: {
          widgetId: widgetId,
          callForDragOrResize: undefined,
          force: true,
        },
      });
      history.replace(
        BUILDER_PAGE_URL({
          applicationId,
          pageId,
        }),
      );
    } else {
      queryId &&
        Toaster.show({
          text: errorMessage || createMessage(SNIPING_NOT_SUPPORTED),
          variant: errorMessage ? Variant.danger : Variant.warning,
        });
    }
  } catch (e) {
    log.error(e);
  }
}

function* resetSnipingModeSaga() {
  const currentURL = new URL(window.location.href);
  const searchParams = currentURL.searchParams;
  searchParams.delete("isSnipingMode");
  searchParams.delete("bindTo");
  history.replace({
    ...window.location,
    pathname: currentURL.pathname,
    search: searchParams.toString(),
  });
}

export default function* snipingModeSagas() {
  yield all([
    takeLeading(ReduxActionTypes.BIND_DATA_TO_WIDGET, bindDataToWidgetSaga),
    takeLeading(ReduxActionTypes.RESET_SNIPING_MODE, resetSnipingModeSaga),
  ]);
}
