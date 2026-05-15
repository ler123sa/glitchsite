FROM nginx:alpine

# копируем сайт
COPY . /usr/share/nginx/html

# копируем готовый nginx-конфиг (без шаблонов и envsubst)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# чистим мусор и старый default
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/.dockerignore \
          /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/nginx.conf.template \
 && echo "=== files in html dir ===" \
 && ls -la /usr/share/nginx/html/ \
 && echo "=== nginx config ===" \
 && cat /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

