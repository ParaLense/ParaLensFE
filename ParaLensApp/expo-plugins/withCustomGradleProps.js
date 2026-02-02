// expo-plugins/withCustomGradleProps.js
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withCustomGradleProps(config) {
    return withGradleProperties(config, (props) => {
        const setProperty = (key, value) => {
            // search existing
            const existing = props.modResults.find((p) => p.key === key);
            if (existing) {
                existing.value = value;
            } else {
                props.modResults.push({
                    type: 'property',
                    key,
                    value,
                });
            }
        };

        setProperty(
            'org.gradle.jvmargs',
            '-Xmx4g -XX:MaxMetaspaceSize=1g'
        );

        return props;
    });
};
