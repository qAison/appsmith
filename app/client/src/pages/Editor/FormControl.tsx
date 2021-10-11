import React from "react";
import { ControlProps } from "components/formControls/BaseControl";
import { isHidden } from "components/formControls/utils";
import { useSelector } from "react-redux";
import { getFormValues } from "redux-form";
import FormControlFactory from "utils/FormControlFactory";
import Tooltip from "components/ads/Tooltip";
import {
  FormLabel,
  FormInputHelperText,
  FormInputAnchor,
  FormInputErrorText,
  FormInfoText,
  FormInputSwitchToJsonButton,
} from "components/editorComponents/form/fields/FormInputField";
import { FormIcons } from "icons/FormIcons";

interface FormControlProps {
  config: ControlProps;
  formName: string;
  multipleConfig?: ControlProps[];
}

function FormControl(props: FormControlProps) {
  const formValues = useSelector((state) =>
    getFormValues(props.formName)(state),
  );
  const hidden = isHidden(formValues, props.config.hidden);

  if (hidden) return null;

  return (
    <FormConfig
      config={props.config}
      formName={props.formName}
      multipleConfig={props?.multipleConfig}
    >
      <div className={`t--form-control-${props.config.controlType}`}>
        {FormControlFactory.createControl(
          props.config,
          props.formName,
          props?.multipleConfig,
        )}
      </div>
    </FormConfig>
  );
}

interface FormConfigProps extends FormControlProps {
  children: JSX.Element;
}

function FormConfig(props: FormConfigProps) {
  let top, bottom;

  if (props.multipleConfig?.length) {
    top = (
      <div style={{ display: "flex" }}>
        {props.multipleConfig?.map((config) => {
          return renderFormConfigTop({ config });
        })}
      </div>
    );
    bottom = props.multipleConfig?.map((config) => {
      return renderFormConfigBottom({ config });
    });
    return (
      <>
        {top}
        {props.children}
        {bottom}
      </>
    );
  }

  return (
    <div>
      <div
        style={{
          // TODO: replace condition with props.config.dataType === "TOGGLE"
          display:
            props.config.controlType === "SWITCH" ||
            props.config.controlType === "CHECKBOX"
              ? "flex"
              : "block",
        }}
      >
        {renderFormConfigTop({ config: props.config })}
        {props.children}
      </div>
      {renderFormConfigBottom({ config: props.config })}
    </div>
  );
}

export default FormControl;

function renderFormConfigTop(props: { config: ControlProps }) {
  const {
    displayType,
    encrypted,
    isRequired,
    label,
    showHelp,
    subtitle,
    tooltipText = "",
    url,
    urlText,
  } = { ...props.config };
  return (
    <React.Fragment key={props.config.label}>
      <FormLabel config={props.config}>
        <p className="label-icon-wrapper">
          {label} {isRequired && "*"}{" "}
          {encrypted && (
            <>
              <FormIcons.LOCK_ICON height={12} keepColors width={12} />
              <FormInfoText>Encrypted</FormInfoText>
            </>
          )}
          {showHelp && (
            <Tooltip content={tooltipText} hoverOpenDelay={1000}>
              <FormIcons.HELP_ICON height={16} width={16} />
            </Tooltip>
          )}
        </p>
      </FormLabel>
      {subtitle && <FormInfoText>{subtitle}</FormInfoText>}
      {urlText && (
        <FormInputAnchor href={url} target="_blank">
          {urlText}
        </FormInputAnchor>
      )}
      {displayType && (
        <FormInputSwitchToJsonButton type="button">
          {displayType === "JSON" ? "SWITCH TO GUI" : "SWITCH TO JSON EDITOR"}
        </FormInputSwitchToJsonButton>
      )}
    </React.Fragment>
  );
}

function renderFormConfigBottom(props: { config: ControlProps }) {
  const { description, errorText, info, showError } = { ...props.config };
  return (
    <>
      {description && <FormInputHelperText>{description}</FormInputHelperText>}
      {info && <FormInputHelperText>{info}</FormInputHelperText>}
      {showError && <FormInputErrorText>{errorText}</FormInputErrorText>}
    </>
  );
}
